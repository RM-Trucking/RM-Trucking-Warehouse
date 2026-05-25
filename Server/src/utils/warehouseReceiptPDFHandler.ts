import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

const chunkFreightInformation = (data: any) => {
    const chunkSize = 20;
    let chunks = [];
    const freightInfos = data.freightInfos || [];

    if (freightInfos.length === 0) {
        return [{ ...data, freightInformation: [], pageNumber: 1 }];
    }

    for (let i = 0; i < freightInfos.length; i += chunkSize) {
        chunks.push({
            ...data,
            freightInformation: freightInfos.slice(i, i + chunkSize),
            pageNumber: Math.floor(i / chunkSize) + 1
        });
    }
    return chunks;
}

export const createWarehouseReceiptPDF = async (data: any, rating: boolean, outPath: string) => {

    //Chunk freight information into groups of 20 for pagination
    const chunkedData = chunkFreightInformation(data);

    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let logoImage: any = null;
    try {
        // Attempt to load logo from common paths
        const logoPaths = [
            path.join(process.cwd(), 'static', 'rm-icon.jpg'),
            path.join(__dirname, '../../static/rm-icon.jpg'),
            path.resolve('../static/rm-icon.jpg')
        ];
        
        for (const p of logoPaths) {
            if (fs.existsSync(p)) {
                const imgBuffer = fs.readFileSync(p);
                logoImage = await pdfDoc.embedJpg(new Uint8Array(imgBuffer));
                break;
            }
        }
    } catch (error) {
        console.log('Logo image not found or invalid. Skipping logo.');
    }

    const totalPages = chunkedData.length;

    for (const chunk of chunkedData) {
        const page = pdfDoc.addPage([595, 842]);
        const { width, height } = page.getSize();
        const margin = 40;

        // 1. Header Section
        if (logoImage) {
            const logoDims = logoImage.scale(0.5);
            page.drawImage(logoImage, {
                x: margin,
                y: height - margin - logoDims.height,
                width: logoDims.width,
                height: logoDims.height,
            });
        }

        page.drawText('WAREHOUSE RECEIPT', {
            x: width / 2 - 80,
            y: height - margin - 20,
            font: boldFont,
            size: 16,
            color: rgb(0.1, 0.1, 0.1),
        });

        // Top Right Meta Data
        const metaX = width - 200;
        let metaY = height - margin - 15;
        const drawMeta = (label: string, value: string) => {
            page.drawText(`${label}:`, { x: metaX, y: metaY, font: boldFont, size: 10 });
            page.drawText(value, { x: metaX + 70, y: metaY, font: font, size: 10 });
            metaY -= 15;
        };

        drawMeta('Receipt No', String(data.receiptNumber || 'N/A'));
        drawMeta('Date', data.receiptDate ? new Date(data.receiptDate).toLocaleDateString() : 'N/A');
        drawMeta('PRO No', data.proNumber || 'N/A');
        drawMeta('Status', data.status || 'N/A');

        // Line separator
        page.drawLine({
            start: { x: margin, y: height - 120 },
            end: { x: width - margin, y: height - 120 },
            thickness: 1,
            color: rgb(0.8, 0.8, 0.8),
        });

        // 2. Info Boxes Section
        const infoY = height - 140;
        
        // Left Column
        page.drawText('Customer Details', { x: margin, y: infoY, font: boldFont, size: 10, color: rgb(0.3, 0.3, 0.3) });
        page.drawText(data.customerName || 'N/A', { x: margin, y: infoY - 15, font: font, size: 10 });
        
        page.drawText('Shipper Details', { x: margin, y: infoY - 45, font: boldFont, size: 10, color: rgb(0.3, 0.3, 0.3) });
        page.drawText(data.shipper || data.shipperCompanyName || 'N/A', { x: margin, y: infoY - 60, font: font, size: 10 });

        // Right Column
        const rightColX = width / 2;
        page.drawText('Carrier Details', { x: rightColX, y: infoY, font: boldFont, size: 10, color: rgb(0.3, 0.3, 0.3) });
        page.drawText(data.carrierName || 'N/A', { x: rightColX, y: infoY - 15, font: font, size: 10 });

        page.drawText('Delivery / Driver', { x: rightColX, y: infoY - 45, font: boldFont, size: 10, color: rgb(0.3, 0.3, 0.3) });
        page.drawText(`Driver: ${data.driverName || 'N/A'}`, { x: rightColX, y: infoY - 60, font: font, size: 10 });
        page.drawText(`Door No: ${data.doorNo || 'N/A'}`, { x: rightColX, y: infoY - 75, font: font, size: 10 });

        // Line separator
        page.drawLine({
            start: { x: margin, y: infoY - 95 },
            end: { x: width - margin, y: infoY - 95 },
            thickness: 1,
            color: rgb(0.8, 0.8, 0.8),
        });

        // 3. Freight Details Table
        const tableTop = infoY - 115;
        page.drawText('Freight Information', { x: margin, y: tableTop, font: boldFont, size: 12 });

        const theadY = tableTop - 20;
        // Header background
        page.drawRectangle({
            x: margin, y: theadY - 5, width: width - (margin * 2), height: 20, color: rgb(0.9, 0.9, 0.9)
        });

        // Columns setup
        const cols = [
            { label: 'S.No', x: margin + 5 },
            { label: 'Type', x: margin + 40 },
            { label: 'Pieces', x: margin + 120 },
            { label: 'Weight (lbs)', x: margin + 180 },
            { label: 'Dimensions (L x W x H)', x: margin + 280 }
        ];

        cols.forEach(col => {
            page.drawText(col.label, { x: col.x, y: theadY, font: boldFont, size: 10 });
        });

        // Table Rows
        let rowY = theadY - 20;
        chunk.freightInformation.forEach((item: any, idx: number) => {
            const sNo = ((chunk.pageNumber - 1) * 20) + idx + 1;
            const dimStr = `${item.length || 0} x ${item.width || 0} x ${item.height || 0}`;

            page.drawText(String(sNo), { x: cols[0].x, y: rowY, font: font, size: 10 });
            page.drawText(item.type || 'N/A', { x: cols[1].x, y: rowY, font: font, size: 10 });
            page.drawText(String(item.pieces || 0), { x: cols[2].x, y: rowY, font: font, size: 10 });
            page.drawText(String(item.weight || 0), { x: cols[3].x, y: rowY, font: font, size: 10 });
            page.drawText(dimStr, { x: cols[4].x, y: rowY, font: font, size: 10 });

            // Row bottom border
            page.drawLine({
                start: { x: margin, y: rowY - 5 },
                end: { x: width - margin, y: rowY - 5 },
                thickness: 0.5,
                color: rgb(0.9, 0.9, 0.9),
            });

            rowY -= 20;
        });

        // Totals (Only on the last page)
        if (chunk.pageNumber === totalPages) {
            rowY -= 10;
            page.drawText('Total Pieces:', { x: cols[1].x, y: rowY, font: boldFont, size: 10 });
            page.drawText(String(data.piecesInland || data.totalPieces || 0), { x: cols[2].x, y: rowY, font: boldFont, size: 10 });
            
            page.drawText('Total Weight:', { x: cols[2].x + 40, y: rowY, font: boldFont, size: 10 });
            page.drawText(String(data.weightInland || data.totalWeight || 0), { x: cols[3].x, y: rowY, font: boldFont, size: 10 });
        }

        // Footer
        const footerY = 30;
        page.drawText(`Page ${chunk.pageNumber} of ${totalPages}`, {
            x: width / 2 - 20, y: footerY, font: font, size: 9, color: rgb(0.5, 0.5, 0.5)
        });
        page.drawText(`Generated by R&M Trucking System`, {
            x: margin, y: footerY, font: font, size: 8, color: rgb(0.5, 0.5, 0.5)
        });
        const printDate = new Date().toLocaleString();
        page.drawText(`Printed: ${printDate}`, {
            x: width - margin - 120, y: footerY, font: font, size: 8, color: rgb(0.5, 0.5, 0.5)
        });
    };

    try {
        const outputDir = outPath;
        const pdfPath = path.join(outputDir, `${data.receiptNumber || 'Receipt'}.pdf`);

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
            console.log('Directory created successfully:', outputDir);
        }

        // Save the PDF document
        const pdfBytes = await pdfDoc.save();
        fs.writeFileSync(pdfPath, pdfBytes);
        console.log(`PDF created successfully at ${pdfPath}!`);

        return true;
    } catch (e: any) {
        console.error('Error saving PDF:', e);
        return false;
    }
}