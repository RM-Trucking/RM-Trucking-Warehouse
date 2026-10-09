import fs from 'fs';
import path from 'path';

const RECEIPT_EDI_OUTPUT = process.env.RECEIPT_EDI_OUTPUT || 'uploads/warehouse-receipt-edi';
const segmentBreaker = '~';

const toNumber = (value: any, fallback = 0) => {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

const toDateCode = (value: any) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
};

const toTimeCode = (value: any) => {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
        return '';
    }

    return `${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}`;
};

const toString = (value: any) => (value == null ? '' : String(value));

export function toWarehouseReceiptEDI(form: any) {
    const rateInformation = form.rateInformation || {};
    const freightInformation = Array.isArray(form.freightInformation) ? form.freightInformation : [];

    const totalPieces = freightInformation.reduce(
        (sum: number, item: any) => sum + toNumber(item?.pieces),
        0
    );
    const totalActualWeight = freightInformation.reduce(
        (sum: number, item: any) => sum + (toNumber(item?.pieces) * toNumber(item?.weight)),
        0
    );
    const totalDimensionalWeight = freightInformation.reduce(
        (sum: number, item: any) => {
            const pieces = toNumber(item?.pieces);
            const length = toNumber(item?.length);
            const width = toNumber(item?.width);
            const height = toNumber(item?.height);
            const dimFactor = toNumber(rateInformation.dimFactor ?? form.dimFactor ?? 166, 166);

            return sum + (dimFactor > 0 ? (pieces * length * width * height) / dimFactor : 0);
        },
        0
    );

    const dimFactor = toNumber(rateInformation.dimFactor ?? form.dimFactor ?? 166, 166);
    const baseRate = toNumber(
        rateInformation.baseRatePerPound ?? form.baseRatePerPound ?? (rateInformation.baseRate ?? form.baseRate) / 100,
        0
    );
    const totalRate = toNumber(rateInformation.finalRate ?? form.totalRate ?? form.finalRate, 0);
    const minRate = toNumber(rateInformation.minRate ?? form.minRate, 0);
    const maxRate = toNumber(rateInformation.maxRate ?? form.maxRate, 0);
    const reWeight = form.reWeight ?? Math.max(totalActualWeight, totalDimensionalWeight);
    const weight = totalActualWeight;

    const now = new Date();
    const date = toDateCode(form.receiptDate ?? now);
    const time = toTimeCode(form.receiptDate ?? now);
    const referenceNumber = toString(form.receiptNumber || form.referenceNumber || form.verificationId || '000000000');

    return {
        date,
        time,
        referenceNumber,
        billToName: form.customerName || form.billToName || '',
        billTo: form.customerId || form.billTo || '',
        shipperName: form.shipper || form.shipperName || '',
        carrierName: form.carrierName || '',
        weight,
        pieces: totalPieces,
        reWeight,
        dimFactor,
        baseRate,
        totalRate,
        minRate,
        maxRate,
        hazmat: form.hazMat || form.hazmat || 'N',
    };
}

export async function generateEDIForWarehouseReceipt(
    form: any,
    outputDirectory: string = RECEIPT_EDI_OUTPUT
): Promise<boolean> {
    try {
        const data = toWarehouseReceiptEDI(form);

        if (!data.referenceNumber || !data.date || !data.time) {
            throw new Error('Warehouse receipt data is missing required EDI fields');
        }

        const hazmatIndicator = data.hazmat === 'Y' ? 'HAZ' : '';
        const numberOfSegments = 12;
        const transactionSetControlNumber = '0001';
        const numberOfTransactionSetsInGS = '1';

        const ediOutput = `ISA*00*          *00*          *ZZ*SRINSOFT       *02*RMFT           *${data.date}*${data.time}*U*00401*${data.referenceNumber}*0*P*>${segmentBreaker}
GS*SM*SRINSOFT*RMFT*${data.date}*${data.time}*${data.referenceNumber}*X*004010${segmentBreaker}
ST*204*${transactionSetControlNumber}${segmentBreaker}
B2**RMFT**${data.referenceNumber}${segmentBreaker}
B2A*00${segmentBreaker}
L11*${data.referenceNumber}*ZZ${segmentBreaker}
N1*BT*${data.billToName}* *${data.billTo}*${segmentBreaker}
N1*SF*${data.shipperName}* * *${segmentBreaker}
N1*CA*${data.carrierName}* * *${segmentBreaker}
AT8*G*L*${data.weight}*${data.pieces}*${data.reWeight}${segmentBreaker}
L508*${hazmatIndicator}${segmentBreaker}
L3*${data.dimFactor}*${data.baseRate}*${data.totalRate}${segmentBreaker}
SE*${numberOfSegments}*${transactionSetControlNumber}${segmentBreaker}
GE*${numberOfTransactionSetsInGS}*${data.referenceNumber}${segmentBreaker}
IEA*1*${data.referenceNumber}${segmentBreaker}`;

        fs.mkdirSync(outputDirectory, { recursive: true });
        const outputPath = path.join(outputDirectory, `${data.referenceNumber}.txt`);

        fs.writeFileSync(outputPath, ediOutput, 'utf8');
        console.log(`${data.referenceNumber}.txt has been created successfully at ${outputPath}.`);

        return true;
    } catch (error) {
        console.error('Failed to generate warehouse receipt EDI:', error);
        return false;
    }
}
