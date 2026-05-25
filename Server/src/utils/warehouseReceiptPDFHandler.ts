import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

const chunkFreightInformation = (data: any) => {
    const chunkSize = 20;
    let chunks = [];

    for (let i = 0; i < data.freightInfos.length; i += chunkSize) {
        chunks.push({
            ...data,
            freightInformation: data.freightInfos.slice(i, i + chunkSize),
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

    for (const chunk of chunkedData) {
        const page = pdfDoc.addPage([595, 842]);
        const { width, height } = page.getSize();

        try {
            const imgBuffer = fs.readFileSync('../static/rm-icon.jpg');
            const imgBytes = new Uint8Array(imgBuffer);
            const logoImage = await pdfDoc.embedJpg(imgBytes);

            const logoDims = logoImage.scale(0.5);
            page.drawImage(logoImage, {
                x: 30,
                y: height - 100,
                width: logoDims.width,
                height: logoDims.height,
            });
        } catch (error) {
            console.log('Logo image not found. Skipping logo.');
        }

    };


    try {
        const outputDir = outPath;
        const pdfPath = path.join(outputDir, `${data.receiptNumber}.pdf`);

        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
            console.log('Directory created successfully!');
        }

        // Save the PDF document
        const pdfBytes = await pdfDoc.save();
        fs.writeFileSync(pdfPath, pdfBytes);
        console.log('PDF created successfully!');

        return true;
    }

    catch (e: any) {
        console.log(e);
        return false;
    }


}