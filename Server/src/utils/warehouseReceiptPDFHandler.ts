import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs';
import path from 'path';


// ---------------------------
// ✅ CHUNK FUNCTION
// ---------------------------
function chunkFreightInformation(data: any) {
    const chunkSize = 20;
    let chunks: any[] = [];

    const freight = data.freightInformation || [];

    if (freight.length === 0) {
        return [{ ...data, freightInformation: [], pageNumber: 1 }];
    }

    for (let i = 0; i < freight.length; i += chunkSize) {
        chunks.push({
            ...data,
            freightInformation: freight.slice(i, i + chunkSize),
            pageNumber: Math.floor(i / chunkSize) + 1,
        });
    }

    return chunks;
}

// ---------------------------
// ✅ MAIN FUNCTION
// ---------------------------

export async function createWarehouseReceiptPDF(
    data: any,
    rating: boolean,
    outPath: string
) {

    console.log("Received By and Location : ", data.receivedBy, data.location)

    const pdfDoc = await PDFDocument.create();
    const chunkedData = chunkFreightInformation(data);

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const toText = (val: any) => String(val ?? '');

    const joinArrayValues = (value: any) => {
        if (Array.isArray(value)) {
            return value.filter((item) => item != null && item !== '').join(', ');
        }

        if (typeof value === 'string') {
            const trimmed = value.trim();
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) {
                        return parsed.filter((item) => item != null && item !== '').join(', ');
                    }
                } catch {
                    // fall through to string fallback
                }
            }
        }

        return String(value ?? '');
    };

    const wrapText = (text: string, maxChars: number, maxLines: number) => {
        const words = text.trim().split(/\s+/);
        const lines: string[] = [];
        let current = '';

        for (let word of words) {
            // ✅ break long words
            while (word.length > maxChars) {
                if (lines.length < maxLines) {
                    lines.push(word.slice(0, maxChars));
                }
                word = word.slice(maxChars);
            }

            if (!current) {
                current = word;
            } else if ((current + ' ' + word).length <= maxChars) {
                current += ' ' + word;
            } else {
                lines.push(current);
                current = word;

                if (lines.length >= maxLines) break;
            }
        }

        if (current && lines.length < maxLines) {
            lines.push(current);
        }

        if (lines.length === maxLines) {
            const lastLine = lines[maxLines - 1];
            if (lastLine.length > 3) {
                lines[maxLines - 1] = lastLine.slice(0, -3) + '...';
            }
        }

        return lines.join('\n');
    };
    // ---------------------------
    // ✅ LOAD LOGO
    // ---------------------------
    let logoImage: any = null;

    try {
        // const logoPath = path.join(process.cwd(), 'src', 'static', 'rm-icon.jpeg');
        const logoPath = './static/rm-icon.jpeg';

        console.log("Looking for logo at:", logoPath);

        if (fs.existsSync(logoPath)) {
            const imgBuffer = fs.readFileSync(logoPath);
            console.log("Logo file found :", imgBuffer);
            const imgBytes = new Uint8Array(imgBuffer);
            console.log("Logo bytes:", imgBytes);
            logoImage = await pdfDoc.embedJpg(imgBytes);
        }
        else {
            console.warn("⚠️  Logo file not found at path:", logoPath);
        }
    } catch {
        console.log('Logo not found');
    }

    // ---------------------------
    // ✅ LOOP PAGES
    // ---------------------------

    for (const chunk of chunkedData) {

        const mm = (v: number) => v * 2.83465;

        const page = pdfDoc.addPage([mm(210), mm(297)]);
        const width = mm(210);
        const height = mm(297);

        const margin = mm(10);

        // ✅ HEADER HEIGHT
        const headerHeight = mm(48);
        const headerTop = height - margin;
        const headerBottom = headerTop - headerHeight;

        const contentWidth = width - (margin * 2);

        // ✅ FIXED PROPORTION (closer to image)
        const leftWidth = contentWidth * 0.58;
        const rightWidth = contentWidth * 0.42;

        const leftX = margin;
        const rightX = leftX + leftWidth;

        // =====================================================
        // ✅ LOGO (KEEP ASPECT RATIO ✅)
        // =====================================================
        if (logoImage) {
            const imgDims = logoImage.scale(1);

            const maxWidth = mm(55);
            const maxHeight = mm(28);

            const scale = Math.min(
                maxWidth / imgDims.width,
                maxHeight / imgDims.height
            );

            const imgWidth = imgDims.width * scale;
            const imgHeight = imgDims.height * scale;

            page.drawImage(logoImage, {
                x: leftX,
                y: headerTop - imgHeight, // ✅ top aligned correctly
                width: imgWidth,
                height: imgHeight,
            });
        }

        // ✅ ADDRESS (aligned relative to logo)
        let addrY = headerTop - mm(30);

        page.drawText('840 E Green St STE 100,', {
            x: leftX,
            y: addrY,
            size: 9,
            font: bold,
        });

        page.drawText('Bensenville, IL 60106', {
            x: leftX,
            y: addrY - mm(5),
            size: 9,
            font: bold,
        });

        page.drawText('Ph# (847)616-1080  Fax# (847)616-8811', {
            x: leftX,
            y: addrY - mm(10),
            size: 9,
            font: bold,
        });


        // =====================================================
        // ✅ PANEL
        // =====================================================
        const padding = mm(5);

        page.drawRectangle({
            x: rightX,
            y: headerBottom,
            width: rightWidth,
            height: headerHeight,
            color: rgb(1, 1, 1),
            borderColor: rgb(0.6, 0.6, 0.6),
            borderWidth: 0.5,
        });

        // Title
        page.drawText('WAREHOUSE RECEIPT', {
            x: rightX + padding,
            y: headerTop - mm(7),
            size: 10,
            font: bold,
        });

        // Divider
        page.drawLine({
            start: { x: rightX, y: headerTop - mm(10) },
            end: { x: rightX + rightWidth, y: headerTop - mm(10) },
            thickness: 0.5,
            color: rgb(0.6, 0.6, 0.6),
        });


        // =====================================================
        // ✅ FINAL GRID (VALUE DOMINATES ✅)
        // =====================================================

        // ✅ Smaller label column
        const labelX = rightX + padding;

        // ✅ Move value even left → BIGGER width ✅
        const valueX = rightX + mm(25);

        // ✅ Max width usage
        const valueWidth = rightWidth - (valueX - rightX) - padding;

        const inputHeight = mm(5);

        // ✅ PERFECT UNIFORM ROW SPACING ✅
        const rowHeight = mm(6.5);

        let y = headerTop - mm(16);


        // =====================================================
        // ✅ FIELD FUNCTION (STRICT ROW SYSTEM)
        // =====================================================
        const field = (label: string, value: any) => {

            page.drawText(label, {
                x: labelX,
                y,
                size: 8,
                font,
            });

            page.drawRectangle({
                x: valueX,
                y: y - mm(1.3),
                width: valueWidth,
                height: inputHeight,
                color: rgb(1, 1, 1),
            });

            page.drawText(String(value || ''), {
                x: valueX + mm(2),
                y,
                size: 8,
                font: bold,
            });

            y -= rowHeight; // ✅ EXACT SAME GAP EVERYWHERE
        };


        // ✅ MAIN FIELDS
        field('Receipt No :', data.receiptNumber);
        field('Date :', data.receiptDate);
        field('Received By :', data.receivedBy);
        field('Location :', data.location);


        // =====================================================
        // ✅ NO EXTRA GAP ❌ (THIS FIXES UNEVEN SPACING)
        // =====================================================


        // =====================================================
        // ✅ BOTTOM ROW (NO OVERLAP ✅ PROPER FLOW)
        // =====================================================

        // ✅ Reduce label count width slightly
        const lcBoxWidth = mm(16);   // ↓ reduced from 20

        // ✅ LABEL COUNT
        page.drawText('Label Count :', {
            x: labelX,
            y,
            size: 8,
            font,
        });

        // Label Count Value
        const lcValueX = valueX;

        page.drawRectangle({
            x: lcValueX,
            y: y - mm(1.3),
            width: lcBoxWidth,
            height: inputHeight,
            color: rgb(1, 1, 1),
        });

        page.drawText(String(data.labelCount || ''), {
            x: lcValueX + mm(2),
            y,
            size: 8,
            font: bold,
        });


        // =====================================================
        // ✅ PAGE NO (FINAL STABLE — NO HIDING ✅)
        // =====================================================

        // ✅ Same width as Label Count
        const pnBoxWidth = lcBoxWidth;

        // ✅ Right edge (same as all fields)
        const rightEdge = rightX + rightWidth - padding;

        // ✅ VALUE BOX (fixed right alignment ✅)
        const pnValueX = rightEdge - pnBoxWidth;

        // ✅ SAFE START (after Label Count value)
        const gapAfterLC = mm(8);
        const pnStartX = lcValueX + lcBoxWidth + gapAfterLC;

        // ✅ Label text
        const labelText = 'Page No :';
        const textSize = 8;

        // ✅ Calculate text width
        const labelTextWidth = bold.widthOfTextAtSize(labelText, textSize);

        // ✅ Place label BETWEEN LC and value box ✅ (centered nicely)
        let pnLabelX = pnStartX;

        // ✅ ensure label fits before value box
        if (pnLabelX + labelTextWidth > pnValueX - mm(4)) {
            pnLabelX = pnValueX - labelTextWidth - mm(4);
        }

        // ✅ DRAW LABEL (guaranteed visible ✅)
        page.drawText(labelText, {
            x: pnLabelX,
            y,
            size: textSize
        });

        // ✅ DRAW VALUE BOX (aligned right ✅)
        page.drawRectangle({
            x: pnValueX,
            y: y - mm(1.3),
            width: pnBoxWidth,
            height: inputHeight,
            color: rgb(1, 1, 1),
        });

        // ✅ VALUE TEXT
        page.drawText(`${chunk.pageNumber}/${chunkedData.length}`, {
            x: pnValueX + mm(2),
            y,
            size: textSize,
            font: bold,
        });


        // =====================================================
        // ✅ NEXT SECTION START
        // =====================================================
        let currentY = headerBottom;

        // =====================================================
        // ✅ GAP AFTER HEADER (2.5 mm)
        // =====================================================
        currentY = currentY - mm(3);

        // =====================================================
        // ✅ SHIPPER / CONSIGNEE (14 mm BOX ✅)
        // =====================================================

        const scBoxHeight = mm(12);
        const scRowHeight = scBoxHeight / 2;

        const sectionTop = currentY;
        const sectionBottom = sectionTop - scBoxHeight;

        const halfWidth = contentWidth / 2;

        const shipperX = margin;
        const consigneeX = margin + halfWidth;

        // =====================================================
        // ✅ OUTER BORDER
        // =====================================================
        page.drawRectangle({
            x: margin,
            y: sectionBottom,
            width: contentWidth,
            height: scBoxHeight,
            color: rgb(1, 1, 1),
            borderColor: rgb(0.7, 0.7, 0.7),
            borderWidth: 0.5,
        });

        // =====================================================
        // ✅ VERTICAL DIVIDER
        // =====================================================
        page.drawLine({
            start: { x: margin + halfWidth, y: sectionBottom },
            end: { x: margin + halfWidth, y: sectionTop },
            thickness: 0.5,
            color: rgb(0.7, 0.7, 0.7),
        });

        // =====================================================
        // ✅ HORIZONTAL DIVIDER (Title / Value)
        // =====================================================
        page.drawLine({
            start: { x: margin, y: sectionTop - scRowHeight },
            end: { x: margin + contentWidth, y: sectionTop - scRowHeight },
            thickness: 0.5,
            color: rgb(0.7, 0.7, 0.7),
        });

        // =====================================================
        // ✅ TITLE ROW (CENTERED ✅)
        // =====================================================
        const titleY = sectionTop - (scRowHeight / 2) - mm(1);

        // SHIPPER TITLE
        const shipperTitle = 'SHIPPER';
        const shipperTitleWidth = bold.widthOfTextAtSize(shipperTitle, 8);

        page.drawText(shipperTitle, {
            x: shipperX + (halfWidth / 2) - (shipperTitleWidth / 2),
            y: titleY,
            size: 8,
            font: bold,
        });

        // CONSIGNEE TITLE
        const consigneeTitle = 'CONSIGNEE';
        const consigneeTitleWidth = bold.widthOfTextAtSize(consigneeTitle, 8);

        page.drawText(consigneeTitle, {
            x: consigneeX + (halfWidth / 2) - (consigneeTitleWidth / 2),
            y: titleY,
            size: 8,
            font: bold,
        });

        // =====================================================
        // ✅ VALUE ROW (CENTERED ✅)
        // =====================================================
        const valueY = sectionBottom + (scRowHeight / 2) - mm(1);

        // SHIPPER VALUE
        const shipperValue = String(data.shipper || '');
        const shipperWidth = font.widthOfTextAtSize(shipperValue, 8);

        page.drawText(shipperValue, {
            x: shipperX + (halfWidth / 2) - (shipperWidth / 2),
            y: valueY,
            size: 8,
            font,
        });

        // CONSIGNEE VALUE
        const consigneeValue = String(`${data.customerName} | ${data.stationName}` || '');
        const consigneeWidth = font.widthOfTextAtSize(consigneeValue, 8);

        page.drawText(consigneeValue, {
            x: consigneeX + (halfWidth / 2) - (consigneeWidth / 2),
            y: valueY,
            size: 8,
            font,
        });

        // =====================================================
        // ✅ UPDATE currentY
        // =====================================================
        currentY = sectionBottom;

        // =====================================================
        // ✅ GAP BEFORE INLAND INFO (2.5 mm)
        // =====================================================
        currentY = currentY - mm(2.5);

        // =====================================================
        // ✅ INLAND INFORMATION (36 mm → 6 ROWS ✅)
        // =====================================================

        const inlHeight = mm(36);       // ✅ updated
        const inlRowHeight = mm(6);     // ✅ fixed row height

        const inlTop = currentY;
        const inlBottom = inlTop - inlHeight;

        const inlWidth = contentWidth;

        // =====================================================
        // ✅ COLUMN STRUCTURE (22% / 28% / 22% / 28%)
        // =====================================================
        const inlCol1 = inlWidth * 0.22;
        const inlCol2 = inlWidth * 0.28;
        const inlCol3 = inlWidth * 0.22;
        const inlCol4 = inlWidth * 0.28;

        const inlCol1X = margin;
        const inlCol2X = inlCol1X + inlCol1;
        const inlCol3X = inlCol2X + inlCol2;
        const inlCol4X = inlCol3X + inlCol3;

        // =====================================================
        // ✅ OUTER BORDER
        // =====================================================
        page.drawRectangle({
            x: margin,
            y: inlBottom,
            width: inlWidth,
            height: inlHeight,
            color: rgb(1, 1, 1),
            borderColor: rgb(0.7, 0.7, 0.7),
            borderWidth: 0.5,
        });

        // =====================================================
        // ✅ ROW LINES (6 ROWS)
        // =====================================================
        for (let i = 1; i < 6; i++) {   // ✅ FIXED (was 7)
            const rowY = inlTop - (i * inlRowHeight);

            page.drawLine({
                start: { x: margin, y: rowY },
                end: { x: margin + inlWidth, y: rowY },
                thickness: 0.5,
                color: rgb(0.7, 0.7, 0.7),
            });
        }

        // =====================================================
        // ✅ COLUMN LINES (SKIP TITLE ROW)
        // =====================================================
        const gridTop = inlTop - inlRowHeight;

        [inlCol2X, inlCol3X, inlCol4X].forEach((x) => {
            page.drawLine({
                start: { x, y: inlBottom },
                end: { x, y: gridTop },
                thickness: 0.5,
                color: rgb(0.7, 0.7, 0.7),
            });
        });

        // =====================================================
        // ✅ TITLE ROW (ROW 1)
        // =====================================================
        const title = 'INLAND INFORMATION';
        const titleWidth = bold.widthOfTextAtSize(title, 9);

        const inlTitleY = inlTop - (inlRowHeight / 2) - mm(1);

        page.drawText(title, {
            x: margin + (inlWidth / 2) - (titleWidth / 2),
            y: inlTitleY,
            size: 8,
            font: bold,
        });

        // =====================================================
        // ✅ DATA ROWS (ROWS 2–6 ✅)
        // =====================================================
        const inlData = [
            ['CARRIER', data.carrierName, 'PACKAGE ID', data.packageId],
            ['PRO NUMBER', data.proNumber, 'PIECES (Customer Info)', data.piecesInland],
            ['INVOICE NUMBER', data.invoiceNumber, 'WEIGHT (Customer Info)', data.weightInland],
            ['PO NUMBER', data.poNumber, 'RE WEIGHT', data.reWeight],
            ['CUSTOMER REF NUMBER', data.customerRefNumber, 'CBM (m³)', data.cubicMeter],
        ];

        // Loop rows
        inlData.forEach((row, i) => {

            const y =
                inlTop - inlRowHeight - (i * inlRowHeight) - (inlRowHeight / 2) - mm(1);

            // Col 1
            page.drawText(String(row[0] || ''), {
                x: inlCol1X + mm(2),
                y,
                size: 8,
                font: bold
            });

            // Col 2
            page.drawText(String(row[1] || ''), {
                x: inlCol2X + mm(2),
                y,
                size: 8,
                font
            });

            // Col 3
            page.drawText(String(row[2] || ''), {
                x: inlCol3X + mm(2),
                y,
                size: 8,
                font: bold
            });

            // Col 4
            page.drawText(String(row[3] || ''), {
                x: inlCol4X + mm(2),
                y,
                size: 8,
                font
            });
        });

        // =====================================================
        // ✅ UPDATE FLOW
        // =====================================================
        currentY = inlBottom;

        // =====================================================
        // ✅ GAP BEFORE TABLES (2.5 mm)
        // =====================================================
        currentY = currentY - mm(2.5);

        // =====================================================
        // ✅ CONFIG
        // =====================================================
        const tblRowHeight = mm(7);
        const tblRows = 11;
        const tblHeight = tblRowHeight * tblRows;

        const tblTop = currentY;
        const tblBottom = tblTop - tblHeight;

        // =====================================================
        // ✅ WIDTH SETUP
        // =====================================================
        const gapBetweenTables = mm(4);
        const singleTableWidth = (contentWidth - gapBetweenTables) / 2;

        const leftTableX = margin;
        const rightTableX = margin + singleTableWidth + gapBetweenTables;

        // =====================================================
        // ✅ COLUMN CONFIG (8 columns)
        // =====================================================
        const colCount = 8;
        const colWidth = singleTableWidth / colCount;

        // =====================================================
        // ✅ FORMAT DATA INTO TABLE ROWS
        // =====================================================
        const formatRows = (dataArr: any[]) => {

            const rows: any[] = [];

            // ✅ HEADER ROW
            rows.push([
                'ITEM',
                'PCS',
                'TYPE',
                'LENGTH',
                'WIDTH',
                'HEIGHT',
                'WEIGHT',
                'CBM(m³)'
            ]);

            // ✅ DATA
            dataArr.forEach((item, index) => {
                rows.push([
                    index + 1,
                    item.pieces ?? '',
                    item.type ?? '',
                    item.length ?? '',
                    item.width ?? '',
                    item.height ?? '',
                    item.weight ?? '',
                    item.cubicMeter ?? ''
                ]);
            });

            // ✅ FILL EMPTY ROWS UP TO 11
            while (rows.length < tblRows) {
                rows.push(['', '', '', '', '', '', '', '']);
            }

            return rows.slice(0, tblRows);
        };

        // =====================================================
        // ✅ DRAW TABLE FUNCTION
        // =====================================================
        const drawTable = (tableX: number, tableData: any[]) => {

            // ✅ BORDER
            page.drawRectangle({
                x: tableX,
                y: tblBottom,
                width: singleTableWidth,
                height: tblHeight,
                color: rgb(1, 1, 1),
                borderColor: rgb(0.7, 0.7, 0.7),
                borderWidth: 0.5,
            });

            // ✅ ROW LINES
            for (let i = 1; i < tblRows; i++) {
                const y = tblTop - (i * tblRowHeight);

                page.drawLine({
                    start: { x: tableX, y },
                    end: { x: tableX + singleTableWidth, y },
                    thickness: 0.5,
                    color: rgb(0.7, 0.7, 0.7),
                });
            }

            // ✅ COLUMN LINES
            for (let i = 1; i < colCount; i++) {
                const x = tableX + (i * colWidth);

                page.drawLine({
                    start: { x, y: tblBottom },
                    end: { x, y: tblTop },
                    thickness: 0.5,
                    color: rgb(0.7, 0.7, 0.7),
                });
            }

            // =====================================================
            // ✅ DRAW TEXT (CENTERED ✅)
            // =====================================================
            tableData.forEach((row, rowIndex) => {

                const textY =
                    tblTop - (rowIndex * tblRowHeight) - (tblRowHeight / 2) - mm(1);

                row.forEach((cell: any, colIndex: number) => {

                    const cellStartX = tableX + (colIndex * colWidth);

                    const text = String(cell ?? '');

                    const activeFont = rowIndex === 0 ? bold : font;

                    const textWidth = activeFont.widthOfTextAtSize(text, 7);

                    const textX = cellStartX + (colWidth / 2) - (textWidth / 2);

                    page.drawText(text, {
                        x: textX,
                        y: textY,
                        size: 7,
                        font: activeFont,
                    });

                });
            });
        };

        // =====================================================
        // ✅ PREPARE DATA FROM CHUNK
        // =====================================================
        const items = chunk.freightInformation || [];

        // split items into left & right tables
        const half = tblRows - 1; // since row 1 = header

        const leftItems = items.slice(0, half);
        const rightItems = items.slice(half, half * 2);

        // =====================================================
        // ✅ DRAW BOTH TABLES
        // =====================================================
        drawTable(leftTableX, formatRows(leftItems));
        drawTable(rightTableX, formatRows(rightItems));

        // =====================================================
        // ✅ UPDATE FLOW
        // =====================================================
        currentY = tblBottom;

        // =====================================================
        // ✅ GAP BEFORE FREIGHT INFO
        // =====================================================
        currentY = currentY - mm(2.5);

        // =====================================================
        // ✅ FREIGHT INFORMATION (30 mm → 5 ROWS ✅)
        // =====================================================
        const frtHeight = mm(30);
        const frtRowHeight = mm(6);

        const frtTop = currentY;
        const frtBottom = frtTop - frtHeight;

        const frtWidth = contentWidth;

        // =====================================================
        // ✅ COLUMN STRUCTURE (20 / 30 / 20 / 30)
        // =====================================================
        const frtCol1 = frtWidth * 0.20;
        const frtCol2 = frtWidth * 0.30;
        const frtCol3 = frtWidth * 0.20;
        const frtCol4 = frtWidth * 0.30;

        const frtCol1X = margin;
        const frtCol2X = frtCol1X + frtCol1;
        const frtCol3X = frtCol2X + frtCol2;
        const frtCol4X = frtCol3X + frtCol3;

        // =====================================================
        // ✅ BORDER
        // =====================================================
        page.drawRectangle({
            x: margin,
            y: frtBottom,
            width: frtWidth,
            height: frtHeight,
            borderColor: rgb(0.6, 0.6, 0.6),
            borderWidth: 0.5,
        });

        // =====================================================
        // ✅ ROW LINES (skip line in merged right cell ✅)
        // =====================================================
        for (let i = 1; i < 5; i++) {
            const y = frtTop - (i * frtRowHeight);

            if (i === 4) {
                // ✅ draw only left side (avoid split in merged block)
                page.drawLine({
                    start: { x: margin, y },
                    end: { x: frtCol3X, y },
                    thickness: 0.5,
                    color: rgb(0.6, 0.6, 0.6),
                });
            } else {
                page.drawLine({
                    start: { x: margin, y },
                    end: { x: margin + frtWidth, y },
                    thickness: 0.5,
                    color: rgb(0.6, 0.6, 0.6),
                });
            }
        }

        // =====================================================
        // ✅ COLUMN LINES
        // =====================================================
        const frtGridTop = frtTop - frtRowHeight;

        [frtCol2X, frtCol3X, frtCol4X].forEach(x => {
            page.drawLine({
                start: { x, y: frtBottom },
                end: { x, y: frtGridTop },
                thickness: 0.5,
                color: rgb(0.6, 0.6, 0.6),
            });
        });

        // =====================================================
        // ✅ TITLE (CENTERED)
        // =====================================================
        const frtTitle = 'FREIGHT INFORMATION';
        const frtTitleWidth = bold.widthOfTextAtSize(frtTitle, 8);

        page.drawText(frtTitle, {
            x: margin + frtWidth / 2 - frtTitleWidth / 2,
            y: frtTop - frtRowHeight / 2 - mm(1.3),
            size: 8,
            font: bold,
        });

        // =====================================================
        // ✅ CHECKBOX (PERFECT STYLE ✅)
        // =====================================================
        const drawCheckbox = (x: number, centerY: number, value: string) => {

            const size = mm(3.5);
            const strokeWidth = 0.8;

            const boxY = centerY - (size / 2);

            // =====================================================
            // ✅ OUTER BOX
            // =====================================================
            page.drawRectangle({
                x,
                y: boxY,
                width: size,
                height: size,
                color: rgb(1, 1, 1),
                borderColor: rgb(0, 0, 0),
                borderWidth: strokeWidth,
            });

            // =====================================================
            // ✅ TICK MARK (PERFECT SHAPE ✅)
            // =====================================================
            if (value === 'Y') {

                const padding = mm(0.6);

                const startX = x + padding;
                const startY = boxY + size * 0.45;

                const midX = x + size * 0.45;
                const midY = boxY + padding;

                const endX = x + size - padding;
                const endY = boxY + size - padding;

                // First stroke (/)
                page.drawLine({
                    start: { x: startX, y: startY },
                    end: { x: midX, y: midY },
                    thickness: 1.2,
                    color: rgb(0, 0, 0),
                });

                // Second stroke (\)
                page.drawLine({
                    start: { x: midX, y: midY },
                    end: { x: endX, y: endY },
                    thickness: 1.2,
                    color: rgb(0, 0, 0),
                });
            }
        };


        // =====================================================
        // ✅ DATA
        // =====================================================
        const frtData = [
            ['BANDED SKID', data.bandedSkid, 'DOCUMENT', data.documents],
            ['SHRINK WRAPPED SKID', data.shrinkWrappedSkid, 'BAD FREIGHT CONDITION', data.freightCondition],
            ['SHT / IPPC SKID', data.shtIppcSkid, 'FREIGHT CONDITION DESCRIPTION', data.handlingDescription],
            ['PLASTIC SKID', data.plasticSkid],
        ];

        // =====================================================
        // ✅ DRAW DATA
        // =====================================================
        frtData.forEach((row, i) => {

            const baseY =
                frtTop - frtRowHeight - (i * frtRowHeight) - (frtRowHeight / 2);

            const textY = baseY - mm(1.2); // ✅ perfect text centering

            const checkboxCenterY = baseY;  // ✅ checkbox centered on row

            // ✅ LEFT LABEL
            page.drawText(row[0], {
                x: frtCol1X + mm(2),
                y: textY,
                size: 8,
                font: bold,
            });

            // ✅ LEFT CHECKBOX (CENTERED ✅)
            drawCheckbox(frtCol2X + mm(2.5), checkboxCenterY, row[1]);

            // =====================================================
            // ✅ RIGHT SIDE NORMAL (ROWS 1 & 2)
            // =====================================================
            if (i === 0 || i === 1) {
                page.drawText(row[2], {
                    x: frtCol3X + mm(2),
                    y: textY,
                    size: 8,
                    font: bold,
                });

                drawCheckbox(frtCol4X + mm(2.5), checkboxCenterY, row[3]);
            }

            // =====================================================
            // ✅ MERGED DESCRIPTION (ROWS 3 + 4 ✅)
            // =====================================================
            if (i === 2) {

                const mergedTop = frtTop - frtRowHeight - (2 * frtRowHeight);
                const mergedBottom = mergedTop - (frtRowHeight * 2);

                const cellHeight = frtRowHeight * 2;     // 12 mm total
                const halfHeight = cellHeight / 2;       // 6 mm each

                const contentPadding = mm(2);

                // =====================================================
                // ✅ TOP HALF: LABEL ✅
                // =====================================================
                const topHalfCenter = mergedTop - halfHeight / 2;

                page.drawText(row[2] || '', {
                    x: frtCol3X + contentPadding,
                    y: topHalfCenter - mm(1),
                    size: 8,
                    font: bold,
                    maxWidth: frtCol3 - (contentPadding * 2),
                    lineHeight: 8,
                });

                // =====================================================
                // ✅ BOTTOM HALF: VALUE (PROPER CENTERING ✅)
                // =====================================================

                let valueText = row[3] || '';

                const maxLines = 3;

                // ✅ ✅ PROPER LINE HEIGHT (IMPORTANT FIX)
                const lineHeight = 7;   // ✅ was 5.5 → now balanced

                const maxCharsPerLine = 32;

                // ✅ truncate
                const maxChars = maxLines * maxCharsPerLine;
                if (valueText.length > maxChars) {
                    valueText = valueText.substring(0, maxChars - 3) + '...';
                }

                // ✅ count lines
                const valueLines = Math.min(
                    maxLines,
                    Math.ceil(valueText.length / maxCharsPerLine)
                );

                // ✅ text block height
                const textBlockHeight = valueLines * lineHeight;

                // ✅ bottom half height (6 mm)
                const bottomHalfHeight = frtRowHeight;

                // ✅ ✅ TRUE CENTER
                let valueY =
                    mergedBottom +
                    ((bottomHalfHeight - textBlockHeight) / 2) +
                    textBlockHeight
                    - mm(0.3);   // ✅ very small baseline correction only

                // ✅ draw
                page.drawText(valueText, {
                    x: frtCol4X + contentPadding,
                    y: valueY,
                    size: 7,
                    font,
                    maxWidth: frtCol4 - (contentPadding * 2),
                    lineHeight: lineHeight
                });


            }


        });

        // =====================================================
        // ✅ UPDATE FLOW
        // =====================================================
        currentY = frtBottom;

        // =====================================================
        // ✅ GAP BEFORE HAZARDOUS
        // =====================================================
        currentY = currentY - mm(2.5);

        const rowH = mm(6);
        const hazWidth = contentWidth;

        const hazCol1 = hazWidth * 0.20;
        const hazCol2 = hazWidth * 0.30;
        const hazCol3 = hazWidth * 0.20;
        const hazCol4 = hazWidth * 0.30;

        const x1 = margin;
        const x2 = x1 + hazCol1;
        const x3 = x2 + hazCol2;
        const x4 = x3 + hazCol3;

        let hazY = currentY;

        // =====================================================
        // ✅ ROW 1 → TITLE
        // =====================================================
        page.drawRectangle({
            x: x1,
            y: hazY - rowH,
            width: hazWidth,
            height: rowH,
            borderColor: rgb(0.6, 0.6, 0.6),
            borderWidth: 0.5,
        });

        const hazTitle = 'HAZARDOUS MATERIAL';

        page.drawText(hazTitle, {
            x: x1 + hazWidth / 2 - bold.widthOfTextAtSize(hazTitle, 8) / 2,
            y: hazY - rowH / 2 - mm(1.2),
            size: 8,
            font: bold,
        });

        hazY -= rowH;

        // =====================================================
        // ✅ ROW 2 → HAZMAT + PROPER SHIPPING NAME
        // =====================================================
        page.drawRectangle({
            x: x1,
            y: hazY - rowH,
            width: hazWidth,
            height: rowH,
            borderColor: rgb(0.6, 0.6, 0.6),
            borderWidth: 0.5,
        });

        [x2, x3, x4].forEach(colX => {
            page.drawLine({
                start: { x: colX, y: hazY },
                end: { x: colX, y: hazY - rowH },
                thickness: 0.5,
                color: rgb(0.6, 0.6, 0.6),
            });
        });

        page.drawText('HAZMAT', {
            x: x1 + mm(2),
            y: hazY - rowH / 2 - mm(1),
            size: 8,
            font: bold,
        });

        drawCheckbox(x2 + mm(2), hazY - rowH / 2, String(data.hazMat || 'N'));

        page.drawText('PROPER SHIPPING NAME', {
            x: x3 + mm(2),
            y: hazY - rowH / 2 - mm(1),
            size: 8,
            font: bold,
        });

        page.drawText(String(data.properShippingName || ''), {
            x: x4 + mm(2),
            y: hazY - rowH / 2 - mm(1),
            size: 7,
            font,
            maxWidth: hazCol4 - mm(4),
        });

        hazY -= rowH;

        // =====================================================
        // ✅ ROW 3 → ORIGINAL DGD + DESTINATION
        // =====================================================
        page.drawRectangle({
            x: x1,
            y: hazY - rowH,
            width: hazWidth,
            height: rowH,
            borderColor: rgb(0.6, 0.6, 0.6),
            borderWidth: 1,
        });

        [x2, x3, x4].forEach(colX => {
            page.drawLine({
                start: { x: colX, y: hazY },
                end: { x: colX, y: hazY - rowH },
                thickness: 0.5,
                color: rgb(0.6, 0.6, 0.6),
            });
        });

        page.drawText('ORIGINAL DGD', {
            x: x1 + mm(2),
            y: hazY - rowH / 2 - mm(1),
            size: 8,
            font: bold,
        });

        drawCheckbox(x2 + mm(2), hazY - rowH / 2, String(data.originalDgd || 'N'));

        page.drawText('DESTINATION', {
            x: x3 + mm(2),
            y: hazY - rowH / 2 - mm(1),
            size: 8,
            font: bold,
        });

        page.drawText(String(data.destination || ''), {
            x: x4 + mm(2),
            y: hazY - rowH / 2 - mm(1),
            size: 7,
            font,
            maxWidth: hazCol4 - mm(4),
        });

        hazY -= rowH;

        // =====================================================
        // ✅ ROW 4 → UN NUMBER / DESCRIPTION
        // =====================================================
        const block24 = rowH * 4;

        page.drawRectangle({
            x: x1,
            y: hazY - block24,
            width: hazWidth,
            height: block24,
            borderColor: rgb(0.6, 0.6, 0.6),
            borderWidth: 0.5,
        });

        [x2, x3, x4].forEach(colX => {
            page.drawLine({
                start: { x: colX, y: hazY },
                end: { x: colX, y: hazY - block24 },
                thickness: 0.5,
                color: rgb(0.6, 0.6, 0.6),
            });
        });

        page.drawText('UN NUMBER', {
            x: x1 + mm(2),
            y: hazY - mm(4),
            size: 8,
            font: bold,
        });

        const unNumberText = wrapText(joinArrayValues(data.unNumber), 40, 7);

        page.drawText(unNumberText, {
            x: x2 + mm(2),
            y: hazY - mm(4),
            size: 7,
            font,
            maxWidth: hazCol2 - mm(4),
            lineHeight: 7,
        });

        page.drawText('DESCRIPTION', {
            x: x3 + mm(2),
            y: hazY - mm(4),
            size: 8,
            font: bold,
        });

        const descText = wrapText(joinArrayValues(data.hazardousDescription), 40, 7);

        page.drawText(descText, {
            x: x4 + mm(2),
            y: hazY - mm(4),
            size: 7,
            font,
            maxWidth: hazCol4 - mm(4),
            lineHeight: 7,
        });

        hazY -= block24;

        // =====================================================
        // ✅ ROW 5 → CLASS / NOTES
        // =====================================================
        page.drawRectangle({
            x: x1,
            y: hazY - block24,
            width: hazWidth,
            height: block24,
            borderColor: rgb(0.6, 0.6, 0.6),
            borderWidth: 0.5,
        });

        [x2, x3, x4].forEach(colX => {
            page.drawLine({
                start: { x: colX, y: hazY },
                end: { x: colX, y: hazY - block24 },
                thickness: 0.5,
                color: rgb(0.6, 0.6, 0.6),
            });
        });

        page.drawText('CLASS', {
            x: x1 + mm(2),
            y: hazY - mm(4),
            size: 8,
            font: bold,
        });

        const classText = wrapText(joinArrayValues(data.class), 40, 7);

        page.drawText(classText, {
            x: x2 + mm(2),
            y: hazY - mm(4),
            size: 7,
            font,
            maxWidth: hazCol2 - mm(4),
            lineHeight: 7,
        });

        page.drawText('NOTES', {
            x: x3 + mm(2),
            y: hazY - mm(4),
            size: 8,
            font: bold,
        });

        const notesText = wrapText(joinArrayValues(data.notes), 40, 7);

        page.drawText(notesText, {
            x: x4 + mm(2),
            y: hazY - mm(4),
            size: 7,
            font,
            maxWidth: hazCol4 - mm(4),
            lineHeight: 7,
        });

        hazY -= block24;

        // =====================================================
        // ✅ FINAL FLOW
        currentY = hazY;


    }


    // ---------------------------
    // ✅ SAVE
    // ---------------------------
    const pdfBytes = await pdfDoc.save();

    if (!fs.existsSync(outPath)) {
        fs.mkdirSync(outPath, { recursive: true });
    }

    const filePath = path.join(
        outPath,
        `${String(data.receiptNumber || 'receipt')}.pdf`
    );

    fs.writeFileSync(filePath, pdfBytes);

    console.log('✅ PDF Created:', filePath);

    return filePath;
}

