import path from "path";
import * as chokidar from 'chokidar';
import fs from 'fs';

const PICKUP_EDI_OUTPUT = process.env.PICKUP_EDI_OUTPUT || 'uploads/pickup-edi';

export async function generatePickupEDI(data: any) {
    try {
        const pickupDate = new Date(data.pickupDate);
        const date = Number.isNaN(pickupDate.getTime())
            ? formatDate(String(data.pickupDate))
            : `${pickupDate.getFullYear()}${String(pickupDate.getMonth() + 1).padStart(2, '0')}${String(pickupDate.getDate()).padStart(2, '0')}`;
        const currentSystemTime = new Date();
        const time = `${String(currentSystemTime.getHours()).padStart(2, '0')}${String(currentSystemTime.getMinutes()).padStart(2, '0')}`;
        const finalPickupData = {
            ...data,
            controlNumber: Number(data.pickupId || data.shipmentId),
            referenceNumber: data.barcodeNumber,
            date,
            time,
            readyDate: formatDate(String(data.readyDate)),
            closeDate: formatDate(String(data.closeDate)),
            lockOutDate: formatDate(String(data.loDate)),
            readyTime: data.readyTime ? formatTime(String(data.readyTime)) : '',
            closeTime: data.closeTime ? formatTime(String(data.closeTime)) : '',
            lockOutTime: data.loTime ? formatTime(String(data.loTime)) : '',
            billToName: data.customerName || '',
            billTo: data.billTo || data.customerId || '',
            billToAddressLine1: data.stationAddressLine1 || '',
            billToAddressLine2: data.stationAddressLine2 || '',
            contactName: data.contactName || '',
            phoneNumber: data.contactPhoneNumber || data.stationPhoneNumber || '',
            shipperName: data.shipperName || data.customerName || '',
            shipperAddressLine1: data.shipperAddressLine1 || data.stationAddressLine1 || '',
            shipperAddressLine2: data.shipperAddressLine2 || data.stationAddressLine2 || '',
            shipperCity: data.shipperCity || data.stationCity || '',
            shipperState: data.shipperState || data.stationState || '',
            shipperZipCode: data.shipperZipCode || data.stationZipCode || '',
            airBillNumber: data.airBillNumber || '',
            weight: data.weight || 0,
            pieces: data.pieces || 0,
            dropAirLineCode: data.airlineCode || '',
            hazmat: data.hazmat || 'N',
        };
        const controlNumber = formatControlNumber(finalPickupData.controlNumber).controlNumber;
        const gsControlNumber = formatControlNumber(finalPickupData.controlNumber).gsControlNumber;
        const transactionSetControlNumber = '0001';
        const shipperCountryCode = 'US';
        const hazmatIndicator = finalPickupData.hazmat === 'Y' ? 'HAZ' : '';
        const numberOfSegments = '19';
        const numberOfTransactionSetsInGS = '1';
        const segmentBreaker = '~';

        const ediOutput = `
ISA*00*          *00*          *ZZ*SRINSOFT       *02*RMFT           *${finalPickupData.date}*${finalPickupData.time}*U*00401*${controlNumber}*0*P*>${segmentBreaker}
GS*SM*SRINSOFT*RMFT*${finalPickupData.date}*${finalPickupData.time}*${gsControlNumber}*X*004010${segmentBreaker}
ST*204*${transactionSetControlNumber}${segmentBreaker}
B2**RMFT**${finalPickupData.referenceNumber}${segmentBreaker}
B2A*00${segmentBreaker}
L11*${finalPickupData.referenceNumber}*ZZ${segmentBreaker}
REF*AW*${finalPickupData.airBillNumber}*${segmentBreaker}
N1*BT*${finalPickupData.billToName}* *${finalPickupData.billTo}*${segmentBreaker}
N3*${finalPickupData.billToAddressLine1}*${finalPickupData.billToAddressLine2}${segmentBreaker}
G61*IC*${finalPickupData.contactName}*TE*${finalPickupData.phoneNumber}${segmentBreaker}
N1*SF*${finalPickupData.shipperName}* * *${segmentBreaker}
N3*${finalPickupData.shipperAddressLine1}*${finalPickupData.shipperAddressLine2}${segmentBreaker}
N4*${finalPickupData.shipperCity}*${finalPickupData.shipperState}*${finalPickupData.shipperZipCode}*${shipperCountryCode}${segmentBreaker}
G62*38*${finalPickupData.readyDate}*${finalPickupData.readyTime}*LT${segmentBreaker} 
G62*39*${finalPickupData.closeDate}*${finalPickupData.closeTime}*LT${segmentBreaker} 
G62*40*${finalPickupData.lockOutDate}*${finalPickupData.lockOutTime}*LT${segmentBreaker}
AT8*G*L*${finalPickupData.weight}*${finalPickupData.pieces}${segmentBreaker}
N1*CN*${finalPickupData.dropAirLineCode}* * *${segmentBreaker}
L508*${hazmatIndicator}${segmentBreaker}
S5*1*CU${segmentBreaker}
SE*${numberOfSegments}*${transactionSetControlNumber}${segmentBreaker}
GE*${numberOfTransactionSetsInGS}*${gsControlNumber}${segmentBreaker}
IEA*1*${controlNumber}${segmentBreaker}
`.trim();

        fs.mkdirSync(PICKUP_EDI_OUTPUT, { recursive: true });
        const outputPath = path.join(PICKUP_EDI_OUTPUT, `${finalPickupData.referenceNumber}.txt`);

        fs.writeFileSync(outputPath, ediOutput, 'utf8');

        console.log(`${finalPickupData.referenceNumber}.txt has been created successfully.`);

        return true;
    }
    catch (e) {
        console.log(e);
        throw e;
    }
}

export const formatDate = (dateString: any) => {
    const date = new Date(dateString);
    if (!Number.isNaN(date.getTime())) {
        return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    }

    const [month, day, year] = String(dateString).split('/');
    return `${year}${month.padStart(2, '0')}${day.padStart(2, '0')}`;
};

// Function to format time to HHMM
export const formatTime = (timeString: any) => {
    const timeValue = String(timeString);
    const parsedDate = new Date(timeValue);
    if (!Number.isNaN(parsedDate.getTime()) && timeValue.includes('T')) {
        return `${String(parsedDate.getHours()).padStart(2, '0')}${String(parsedDate.getMinutes()).padStart(2, '0')}`;
    }

    const [time, modifier] = timeValue.split(' ');
    let [hours, minutes] = time.split(':');

    if (modifier === 'PM' && hours !== '12') {
        hours = String(parseInt(hours, 10) + 12);
    } else if (modifier === 'AM' && hours === '12') {
        hours = '00';
    }

    return `${hours.padStart(2, '0')}${minutes.padStart(2, '0')}`;
};

export const formatControlNumber = (input: number) => {
    let inputStr = String(input);

    let output1 = inputStr.padStart(9, '0');

    let output2 = inputStr.padStart(4, '0');

    return {
        controlNumber: output1,
        gsControlNumber: output2
    };
}

export async function watchResponse() {
    console.log("Tell System Response Watcher is ON...");

    let responsePath = "";

    const watcher = chokidar.watch(responsePath, {
        persistent: true,
        ignoreInitial: true
    });

    watcher.on('add', (filePath: string) => {

        const fileName = path.basename(filePath);
        const barcodeNumber = fileName.split('.')[0];

        setTimeout(() => {
            getPickupEntryDetails(filePath, async ({ pickupNumber, barcodeNumber }) => {
                if (pickupNumber && barcodeNumber) {
                    // await addPickupEntryNumberToStatus((barcodeNumber).toString(), (pickupNumber).toString());
                    console.log("Status Updated....");
                } else {
                    console.log('Pickup Entry Number or Barcode Number not found');
                }
            });
        }, 1000);

    });

    watcher.on('error', (error) => {
        console.error('File watcher error:', error);
    });

    watcher.on('ready', () => {
        console.log('Watcher is set up and running...');
    });
}

export function getPickupEntryDetails(
    filePath: string,
    callback: (result: { pickupNumber: number | null; barcodeNumber: number | null }) => void
): void {
    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            callback({ pickupNumber: null, barcodeNumber: null });
            return;
        }

        if (!data || data.trim().length === 0) {
            callback({ pickupNumber: null, barcodeNumber: null });
            return;
        }

        let delimiter = detectDelimiter(data); // Default to '~'
        if (!['~', '*', '>'].includes(delimiter)) {
            delimiter = '~'; // Fallback to '~' if unexpected delimiter
        }



        const segments = data
            .split(new RegExp(`[${delimiter}\r\n]+`)) // Splitting using multiple delimiters
            .map((s) => s.trim())
            .filter(Boolean);

        let pickupNumber: number | null = null;
        let barcodeNumber: number | null = null;

        for (const segment of segments) {

            // Split each segment using '*'
            const elements = segment.split('*').map((e) => e.trim());
            const segmentId = elements[0] || '';


            if (segmentId === 'B1' && elements.length > 2 && /^\d+$/.test(elements[2])) {
                barcodeNumber = parseInt(elements[2], 10);

            }


            if (segmentId === 'N9' && elements[1] === 'CN' && elements.length > 2 && /^\d+$/.test(elements[2])) {
                pickupNumber = parseInt(elements[2], 10);

            }

            if (pickupNumber !== null && barcodeNumber !== null) {
                break; // Stop searching once both values are found
            }
        }


        callback({ pickupNumber, barcodeNumber });
    });
}



function detectDelimiter(data: string): string {
    // Ensure we have at least 106 characters to extract the ISA segment
    if (data.length < 106) {

        return '~'; // Default fallback
    }

    // The delimiter is always at position 105 (0-based index 104)
    let delimiter = data[104];

    // Validate the extracted delimiter (it should be a common EDI delimiter)
    if (!['~', '*', '>', '\r', '\n'].includes(delimiter)) {

        delimiter = '~';
    }

    return delimiter;
}

