import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

const chunkFreightInformation = (data: any) => {
    const chunkSize = 18; // Adjusted to leave elegant spacing for totals and footers
    let chunks = [];
    const freightInfos = data.freightInfos || data.freightInformation || data.items || [];

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
};

// Modern clean label + value renderer
const drawField = (page: any, x: number, y: number, title: string, value: string, font: any, boldFont: any) => {
    page.drawText(title.toUpperCase(), { x, y, font: boldFont, size: 8, color: rgb(0.4, 0.4, 0.4) });
    if (value) {
        page.drawText(String(value), { x, y: y - 14, font: font, size: 10, color: rgb(0.1, 0.1, 0.1) });
    }
};

export const createWarehouseReceiptPDF = async (data: any, rating: boolean, outPath: string) => {
    const chunkedData = chunkFreightInformation(data);
    const pdfDoc = await PDFDocument.create();
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let logoImage: any = null;
    try {
        const logoPaths = [
            path.join(process.cwd(), 'static', 'rm-icon.jpg'),
            path.join(__dirname, '../../static/rm-icon.jpg'),
        ];
        
        for (const p of logoPaths) {
            if (fs.existsSync(p)) {
                const imgBuffer = fs.readFileSync(p);
                logoImage = await pdfDoc.embedJpg(new Uint8Array(imgBuffer));
                break;
            }
        }
    } catch (error) {
        console.log('Logo image not found. Skipping logo.');
    }

    const totalPages = chunkedData.length;

    for (const chunk of chunkedData) {
        const page = pdfDoc.addPage([595, 842]);
        const { width, height } = page.getSize();
        const margin = 40;
        const contentWidth = width - margin * 2;

        let currentY = height - margin;
        
        // === 1. HEADER ===
        if (logoImage) {
            const logoDims = logoImage.scale(0.3);
            page.drawImage(logoImage, {
                x: margin,
                y: currentY - logoDims.height + 10,
                width: logoDims.width,
                height: logoDims.height,
            });
        }

        const titleText = 'WAREHOUSE RECEIPT';
        const titleWidth = boldFont.widthOfTextAtSize(titleText, 20);
        page.drawText(titleText, {
            x: width - margin - titleWidth,
            y: currentY - 5,
            font: boldFont,
            size: 20,
            color: rgb(0.1, 0.1, 0.1)
        });

        const rDate = data.receiptDate ? new Date(data.receiptDate).toLocaleDateString() : new Date().toLocaleDateString();
        const receiptNo = data.receiptNumber || 'N/A';
        
        page.drawText(`Receipt No:`, { x: width - margin - 150, y: currentY - 25, font: boldFont, size: 10, color: rgb(0.4, 0.4, 0.4) });
        page.drawText(String(receiptNo), { x: width - margin - 80, y: currentY - 25, font: boldFont, size: 12, color: rgb(0.8, 0.1, 0.1) });

        page.drawText(`Date:`, { x: width - margin - 150, y: currentY - 40, font: boldFont, size: 10, color: rgb(0.4, 0.4, 0.4) });
        page.drawText(rDate, { x: width - margin - 80, y: currentY - 40, font: font, size: 10, color: rgb(0.1, 0.1, 0.1) });

        currentY -= 65;
        
        page.drawLine({ start: { x: margin, y: currentY }, end: { x: width - margin, y: currentY }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });
        currentY -= 20;

        // === 2. PARTIES SECTION ===
        drawField(page, margin, currentY, 'Shipper', data.shipper || data.shipperCompanyName || 'N/A', font, boldFont);
        drawField(page, margin + 170, currentY, 'Consignee', data.customerName || 'N/A', font, boldFont);
        drawField(page, margin + 340, currentY, 'Delivering Carrier', data.carrierName || 'N/A', font, boldFont);

        currentY -= 45;

        // === 3. CARRIER & TRANSPORT SECTION ===
        drawField(page, margin, currentY, 'PRO Number', data.proNumber || 'N/A', font, boldFont);
        drawField(page, margin + 130, currentY, 'Driver', data.driverName || 'N/A', font, boldFont);
        drawField(page, margin + 260, currentY, 'Door No', data.doorNo || 'N/A', font, boldFont);
        drawField(page, margin + 390, currentY, 'Destination', data.destination || 'N/A', font, boldFont);

        currentY -= 35;

        // === 4. FREIGHT GRID ===
        const tableTop = currentY;
        const rowH = 18;
        
        // Header Background
        page.drawRectangle({ x: margin, y: tableTop - 16, width: contentWidth, height: 22, color: rgb(0.96, 0.96, 0.96) });

        const cols = [
            { label: 'S.NO', width: 40 },
            { label: 'PIECES', width: 55 },
            { label: 'TYPE', width: 90 },
            { label: 'DIMENSIONS (in)', width: 140 },
            { label: 'VOL (ft³)', width: 65 },
            { label: 'WEIGHT (lbs)', width: 80 },
            { label: 'IMAGES', width: 45 }
        ];

        let curX = margin + 10;
        cols.forEach(col => {
            page.drawText(col.label, { x: curX, y: tableTop - 10, font: boldFont, size: 8, color: rgb(0.3, 0.3, 0.3) });
            (col as any).x = curX;
            curX += col.width;
        });

        let rowY = tableTop - 32;
        let pageTotalVolume = 0;
        
        chunk.freightInformation.forEach((item: any, idx: number) => {
            const sNo = ((chunk.pageNumber - 1) * 18) + idx + 1;
            const dimStr = `${item.length || 0} x ${item.width || 0} x ${item.height || 0}`;
            const volNum = (((item.length || 0) * (item.width || 0) * (item.height || 0)) / 1728);
            pageTotalVolume += volNum;
            
            const imgCount = String(item.images?.length || 0);

            page.drawText(String(sNo), { x: (cols[0] as any).x, y: rowY, font: font, size: 9, color: rgb(0.1, 0.1, 0.1) });
            page.drawText(String(item.pieces || 0), { x: (cols[1] as any).x, y: rowY, font: font, size: 9, color: rgb(0.1, 0.1, 0.1) });
            page.drawText(item.type || 'N/A', { x: (cols[2] as any).x, y: rowY, font: font, size: 9, color: rgb(0.1, 0.1, 0.1) });
            page.drawText(dimStr, { x: (cols[3] as any).x, y: rowY, font: font, size: 9, color: rgb(0.1, 0.1, 0.1) });
            page.drawText(volNum.toFixed(2), { x: (cols[4] as any).x, y: rowY, font: font, size: 9, color: rgb(0.1, 0.1, 0.1) });
            page.drawText(String(item.weight || 0), { x: (cols[5] as any).x, y: rowY, font: font, size: 9, color: rgb(0.1, 0.1, 0.1) });
            page.drawText(imgCount, { x: (cols[6] as any).x + 10, y: rowY, font: font, size: 9, color: rgb(0.1, 0.1, 0.1) });

            // Thin bottom border for rows
            page.drawLine({ start: { x: margin, y: rowY - 6 }, end: { x: width - margin, y: rowY - 6 }, thickness: 0.5, color: rgb(0.9, 0.9, 0.9) });

            rowY -= rowH;
        });

        // === 5. TOTALS BOX (Bottom of table) ===
        const totalsY = rowY - 15;
        page.drawText('TOTALS', { x: margin + 10, y: totalsY, font: boldFont, size: 9, color: rgb(0.1, 0.1, 0.1) });
        
        const totPieces = String(data.piecesInland || data.totalPieces || 0);
        const totWeight = String(data.weightInland || data.totalWeight || 0);
        
        page.drawText(totPieces, { x: (cols[1] as any).x, y: totalsY, font: boldFont, size: 10, color: rgb(0.1, 0.1, 0.1) });
        page.drawText(pageTotalVolume.toFixed(2), { x: (cols[4] as any).x, y: totalsY, font: boldFont, size: 10, color: rgb(0.1, 0.1, 0.1) });
        page.drawText(totWeight, { x: (cols[5] as any).x, y: totalsY, font: boldFont, size: 10, color: rgb(0.1, 0.1, 0.1) });

        page.drawLine({ start: { x: margin, y: totalsY - 10 }, end: { x: width - margin, y: totalsY - 10 }, thickness: 1, color: rgb(0.85, 0.85, 0.85) });

        // === 6. SIGNATURE & NOTES SECTION ===
        const footerY = totalsY - 45;
        drawField(page, margin, footerY, 'Remarks / Notes', data.notes || '', font, boldFont);
        
        page.drawText('Received in good order and condition by:', { x: margin + 260, y: footerY, font: boldFont, size: 9, color: rgb(0.3, 0.3, 0.3) });
        
        page.drawLine({ start: { x: margin + 260, y: footerY - 25 }, end: { x: margin + 390, y: footerY - 25 }, thickness: 1, color: rgb(0.1, 0.1, 0.1) });
        page.drawText('Signature', { x: margin + 260, y: footerY - 37, font: font, size: 8, color: rgb(0.5, 0.5, 0.5) });
        
        page.drawLine({ start: { x: margin + 410, y: footerY - 25 }, end: { x: width - margin, y: footerY - 25 }, thickness: 1, color: rgb(0.1, 0.1, 0.1) });
        page.drawText('Date / Time', { x: margin + 410, y: footerY - 37, font: font, size: 8, color: rgb(0.5, 0.5, 0.5) });

        // === 7. META FOOTER ===
        const bottomMetaY = 25;
        page.drawText(`Page ${chunk.pageNumber} of ${totalPages}`, {
            x: width / 2 - 20, y: bottomMetaY, font: font, size: 9, color: rgb(0.6, 0.6, 0.6)
        });
        page.drawText(`Printed: ${new Date().toLocaleString()}`, {
            x: width - margin - 120, y: bottomMetaY, font: font, size: 8, color: rgb(0.6, 0.6, 0.6)
        });
    };

    // === ATTACHMENTS SECTION ===
    const allImages: { base64: string, label: string }[] = [];
    const freightInfos = data.freightInfos || data.freightInformation || data.items || [];
    
    freightInfos.forEach((item: any, idx: number) => {
        if (item.images && Array.isArray(item.images)) {
            item.images.forEach((img: any, imgIdx: number) => {
                let base64Data = "";
                // Handle raw string (Base64 or local path)
                if (typeof img === 'string') {
                    if (img.length < 255 && fs.existsSync(path.resolve(img))) {
                        base64Data = fs.readFileSync(path.resolve(img)).toString('base64');
                    } else if (!img.startsWith('http')) {
                        base64Data = img;
                    }
                } 
                // Handle image object from DB
                else if (img && typeof img === 'object') {
                    if (img.base64) {
                        base64Data = img.base64;
                    } else if (img.imagePath && fs.existsSync(path.resolve(img.imagePath))) {
                        base64Data = fs.readFileSync(path.resolve(img.imagePath)).toString('base64');
                    }
                }
                
                if (base64Data) {
                    allImages.push({
                        base64: base64Data,
                        label: `Item ${idx + 1} - Image ${imgIdx + 1}`
                    });
                }
            });
        }
    });

    if (allImages.length > 0) {
        const imagesPerPage = 4;
        const margin = 30;
        
        for (let i = 0; i < allImages.length; i += imagesPerPage) {
            const page = pdfDoc.addPage([595, 842]);
            const { width, height } = page.getSize();
            
            page.drawText('ATTACHMENTS', {
                x: margin, y: height - margin - 15, font: boldFont, size: 16, color: rgb(0.1, 0.1, 0.1)
            });
            
            page.drawText(`RECEIPT NO: ${data.receiptNumber || 'N/A'}`, {
                x: width - margin - 150, y: height - margin - 15, font: boldFont, size: 11, color: rgb(0.1, 0.1, 0.1)
            });
            
            page.drawLine({
                start: { x: margin, y: height - margin - 25 }, end: { x: width - margin, y: height - margin - 25 }, thickness: 1, color: rgb(0.3, 0.3, 0.3)
            });
            
            const usableW = width - margin * 2;
            const usableH = height - margin * 2 - 40;
            const boxW = (usableW - 20) / 2;
            const boxH = (usableH - 20) / 2;
            
            // 2x2 Grid positions (bottom-left origin)
            const positions = [
                { x: margin, y: margin + 20 + boxH + 20 },
                { x: margin + boxW + 20, y: margin + 20 + boxH + 20 },
                { x: margin, y: margin + 20 },
                { x: margin + boxW + 20, y: margin + 20 }
            ];
            
            const currentImages = allImages.slice(i, i + imagesPerPage);
            
            for (let j = 0; j < currentImages.length; j++) {
                const imgData = currentImages[j];
                const pos = positions[j];
                
                page.drawRectangle({ x: pos.x, y: pos.y, width: boxW, height: boxH, borderColor: rgb(0.85, 0.85, 0.85), borderWidth: 1 });
                page.drawText(imgData.label, { x: pos.x + 5, y: pos.y + boxH - 15, font: boldFont, size: 10, color: rgb(0.2, 0.2, 0.2) });
                
                try {
                    const b64 = imgData.base64.replace(/^data:image\/\w+;base64,/, "");
                    const uint8Array = new Uint8Array(Buffer.from(b64, 'base64'));
                    
                    let embedImg;
                    try { embedImg = await pdfDoc.embedJpg(uint8Array); } 
                    catch { embedImg = await pdfDoc.embedPng(uint8Array); }
                    
                    const imgDims = embedImg.scaleToFit(boxW - 10, boxH - 30);
                    const imgX = pos.x + (boxW - imgDims.width) / 2;
                    const imgY = pos.y + (boxH - 20 - imgDims.height) / 2;
                    
                    page.drawImage(embedImg, { x: imgX, y: imgY, width: imgDims.width, height: imgDims.height });
                } catch (err) {
                    console.error('Error embedding image for attachment page', err);
                    page.drawText('Image failed to load', { x: pos.x + 10, y: pos.y + boxH / 2, font: font, size: 10, color: rgb(0.8, 0.1, 0.1) });
                }
            }
            
            page.drawText(`Attachment Page ${Math.floor(i / imagesPerPage) + 1}`, {
                x: width / 2 - 40, y: 15, font: font, size: 9, color: rgb(0.5, 0.5, 0.5)
            });
        }
    }

    try {
        const outputDir = outPath;
        const pdfPath = path.join(outputDir, `${data.receiptNumber || 'Receipt'}.pdf`);

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }

        const pdfBytes = await pdfDoc.save();
        fs.writeFileSync(pdfPath, pdfBytes);

        return true;
    } catch (e: any) {
        console.error('Error saving PDF:', e);
        return false;
    }
};