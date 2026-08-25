export const dataToZPL = (data: { labelCount: number, receiptNumber: number, customerName: string, packageId: string, shipper: string, carrierName: string, proNumber: string, destination: string, pieces: number, freightBarcodeValue: string, type: string, length: number, width: number, weight: number, height: number }): string => {
    const safeValue = (value: string | number | undefined | null, fallback: string = "") => {
        if (value === undefined || value === null) return fallback;
        return String(value);
    };

    const safeText = (value: string | number | undefined | null, fallback: string = "") => {
        return safeValue(value, fallback).trim();
    };

    let zpl = '';
    for (let i = 0; i < data.labelCount; i++) {
        const barcodeValue = `${safeText(data.receiptNumber, "")}${safeText(data.freightBarcodeValue, "") ? `-${safeText(data.freightBarcodeValue, "")}` : ""}`;
        const receiptLastFour = safeText(data.receiptNumber, "").slice(-4);
        const customerName = safeText(data.customerName, 'N/A').toUpperCase();
        const packageId = safeText(data.packageId, 'N/A');
        const shipper = safeText(data.shipper, 'N/A');
        const carrierName = safeText(data.carrierName, 'N/A');
        const proNumber = safeText(data.proNumber, 'N/A');
        const destination = safeText(data.destination, 'N/A');
        const pieces = safeText(data.pieces, '0');
        const type = safeText(data.type, 'N/A');
        const weight = safeText(data.weight, '0');
        const length = safeText(data.length, '0');
        const width = safeText(data.width, '0');
        const height = safeText(data.height, '0');
        const footerText = `${i + 1} OF ${data.labelCount}`;

        zpl += `
            ^XA
            ^CI28
            ^MMT
            ^PW812
            ^LL1218
            ^LS0
            ^LT0
            ^SZ2

            ^FX --- OUTER BORDER --- ^FS
            ^FO10,10^GB792,1198,4^FS

            ^FX --- SECTION 1: BARCODE & CENTERED SUBTITLE --- ^FS
            ^BY3,3,150
            ^FO600,230^BCR,150,N,N,N^FD${barcodeValue}^FS
            ^FO550,10^A0R,36,36^FB1198,1,0,C^FD${barcodeValue}^FS

            ^FX --- LINE 1 --- ^FS
            ^FO510,10^GB2,1198,4^FS

            ^FX --- SECTION 2: CUSTOMER --- ^FS
            ^FO475,30^A0R,24,24^FDCUSTOMER^FS
            ^FO430,30^A0R,44,44^FD${customerName}^FS

            ^FX --- LINE 2 --- ^FS
            ^FO400,10^GB2,1198,4^FS

            ^FX --- SECTION 3: SHIPPING DETAILS --- ^FS

            ^FO140,780^A0R,210,210^FD${receiptLastFour}^FS

            ^FO360,30^A0R,28,28^FDShipper^FS
            ^FO360,200^A0R,24,24^FD${shipper}^FS

            ^FO320,30^A0R,28,28^FDCarrier^FS
            ^FO320,200^A0R,24,24^FD${carrierName}^FS

            ^FO280,30^A0R,28,28^FDPackage ID^FS
            ^FO280,200^A0R,24,24^FD${packageId}^FS

            ^FO240,30^A0R,28,28^FDPro Number^FS
            ^FO240,200^A0R,24,24^FD${proNumber}^FS

            ^FO200,30^A0R,28,28^FDDestination^FS
            ^FO200,200^A0R,24,24^FD${destination}^FS

            ^FO160,30^A0R,28,28^FDPieces^FS
            ^FO160,200^A0R,24,24^FD${pieces}^FS

            ^FX --- LINE 3 --- ^FS
            ^FO130,10^GB2,1198,4^FS

            ^FX --- SECTION 4: SPECIFICATIONS & INTEGRATED FOOTER --- ^FS
            ^FO85,30^A0R,24,24^FDWidth^FS
            ^FO85,140^A0R,28,28^FD${width}^FS

            ^FO45,30^A0R,24,24^FDWeight^FS
            ^FO45,140^A0R,28,28^FD${weight} LB^FS

            ^FO85,420^A0R,24,24^FDLength^FS
            ^FO85,540^A0R,28,28^FD${length} IN^FS

            ^FO45,420^A0R,24,24^FDType^FS
            ^FO45,540^A0R,28,28^FD${type}^FS

            ^FO85,780^A0R,24,24^FDHeight^FS
            ^FO85,900^A0R,28,28^FD${height} IN^FS

            ^FO55,1030^A0R,36,36^FD${footerText}^FS

            ^XZ
        `;
    }

    return zpl;
}