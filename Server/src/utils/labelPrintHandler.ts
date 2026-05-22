export const dataToZPL = (data: { labelCount: number, receiptNumber: number, customerName: string, packageId: string, shipper: string, carrierName: string, proNumber: string, destination: string, pieces: number }): string => {
    let zpl = '';
    for (let i = 0; i < data.labelCount; i++) {
        zpl += `
                ^XA   
                ^CI28
                ^MMT
                ^PW812
                ^LL1218
                ^LS0
                ^LT0
                ^SZ2
                ^FWB

                ^FO10,10
                ^GB792,1198,2,8^FS

                ^CF0,40
                ^FO30,30^XA
                ^CI28
                ^MMT
                ^PW812
                ^LL1218
                ^LS0
                ^LT0
                ^SZ2

                ^FO10,10
                ^GB792,1198,2,,1^FS


                ^BY3.5,2,150
                ^FO620,280
                ^BCR,160, Y, N, N
                ^FD${data.receiptNumber}-${i + 1}^FS

                ^FO560,30
                ^GB2,1160,2^FS

                ^CF0,40


                ^FO500,50
                ^A0R,50,50
                ^FD${data.customerName.trim().toUpperCase()}^FS

                ^FO430,50
                ^A0R,40,40
                ^FDPackage ID:^FS

                ^FO430,300
                ^A0R,40,40
                ^FD${data.packageId}^FS

                ^FO370,50
                ^A0R,40,40
                ^FDShipper^FS
                ^FO370,300
                ^A0R,40,40
                ^FD${data.shipper}^FS

                ^FO310,50
                ^A0R,40,40
                ^FDCarrier:^FS
                ^FO310,300
                ^A0R,40,40
                ^FD${data.carrierName}^FS

                ^FO250,50
                ^A0R,40,40
                ^FDPro number:^FS
                ^FO250,300
                ^A0R,40,40
                ^FD${data.proNumber}^FS

                ^FO190,50
                ^A0R,40,40
                ^FDDestination:^FS
                ^FO190,300
                ^A0R,40,40
                ^FD${data.destination}^FS

                ^FO130,50
                ^A0R,40,40
                ^FDPiece:^FS
                ^FO130,300
                ^A0R,40,40
                ^FD${data.pieces}^FS

                ^FO100,30
                ^GB2,1160,2^FS

                ^FO30,1050
                ^A0R,40,40
                ^FD${i + 1} OF ${data.labelCount}^FS

                ^XZ
                `;
    }

    return zpl;

}