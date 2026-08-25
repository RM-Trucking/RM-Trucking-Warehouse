import { forwardRef } from 'react';
import PropTypes from 'prop-types';
import Barcode from 'react-barcode';
import RMLogo from '../../assets/RM.png';

const TITLES = {
    active: 'Airport Transfer',
    inactive: 'Ocean LCL Transfer',
    incomplete: 'Ocean FCL Transfer',
};

const border = '1px solid #111';
const cell = { border, padding: '4px 6px', fontSize: 11, lineHeight: 1.3, verticalAlign: 'top' };
const heading = { ...cell, background: '#050505', color: '#fff', fontWeight: 700, textAlign: 'center', fontSize: 11, letterSpacing: 0.2 };
const valueOrBlank = (value) => value ?? '';
const firstValue = (data, fields) => fields.find((field) => data?.[field] !== undefined && data?.[field] !== null && data?.[field] !== '')
    ? data[fields.find((field) => data?.[field] !== undefined && data?.[field] !== null && data?.[field] !== '')]
    : '';
const formatDate = (value) => {
    const date = value ? new Date(value) : new Date();
    return Number.isNaN(date.getTime()) ? valueOrBlank(value) : date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
};
const getReceiptNumber = (receipt) => typeof receipt === 'object'
    ? firstValue(receipt, ['receiptNumber', 'warehouseReceiptNumber', 'warehouseNo', 'id'])
    : receipt;
const getContainerNumber = (container) => typeof container === 'object'
    ? firstValue(container, ['container', 'containerNo', 'containerNumber'])
    : container;

const ShipmentPrintTemplate = forwardRef(({ data, type }, ref) => {
    const title = TITLES[type] || TITLES.active;
    const barcode = firstValue(data, ['barcodeNumber', 'rmNumber', 'rmProNo']);
    const receipts = Array.isArray(data?.receipts) ? data.receipts : [];
    const containers = Array.isArray(data?.containers) ? data.containers : [];
    const totalPieces = firstValue(data, ['pieces', 'totalPieces']) || receipts.reduce((sum, item) => sum + (Number(item?.pieces ?? item?.piecesInland) || 0), 0);
    const totalWeight = firstValue(data, ['weight', 'totalWeight']) || receipts.reduce((sum, item) => sum + (Number(item?.weight ?? item?.reWeight) || 0), 0);
    const consigneeName = firstValue(data, ['airlineName', 'consigneeName', 'consignee']);
    const consigneeAddress = firstValue(data, ['consigneeAddress', 'airlineAddress', 'destination']);
    const consigneeCity = firstValue(data, ['consigneeCityStateZip', 'airlineCityStateZip']);
    const consigneeContact = firstValue(data, ['consigneeContact', 'airlineContact', 'airlineNumber']);
    const instructions = firstValue(data, ['instructions', 'specialInstructions', 'remarks', 'notes']);
    const receiptNumbers = receipts.map(getReceiptNumber).filter(Boolean);
    const containerNumbers = containers.map(getContainerNumber).filter(Boolean);
    const receiptContainerPageCount = Math.max(
        1,
        Math.ceil(Math.max(receiptNumbers.length, containerNumbers.length) / 20)
    );

    return (
        <div ref={ref} style={{ width: 760, minHeight: 1040, margin: '0 auto', padding: 14, boxSizing: 'border-box', color: '#000', background: '#fff', fontFamily: 'Arial, sans-serif' }}>
            <style>{`
                @page { size: A4 portrait; margin: 8mm; }
                .shipment-barcode svg { width: 100%; height: 38px; display: block; }
                @media print { body { margin: 0; } }
            `}</style>

            {Array.from({ length: receiptContainerPageCount }, (_, pageIndex) => (
                <div
                    key={pageIndex}
                    style={{
                        minHeight: 1012,
                        ...(pageIndex > 0 ? { pageBreakBefore: 'always', breakBefore: 'page' } : {}),
                    }}
                >

            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <tbody>
                    <tr>
                        <td style={{ ...cell, border: 'none', width: '58%', height: 92, verticalAlign: 'middle', padding: 8 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
                                <img src={RMLogo} alt="R&M Trucking" style={{ width: 160, height: 60, objectFit: 'contain' }} />
                                <div style={{ fontSize: 12, lineHeight: 1.35, fontWeight: 700 }}>
                                    840 E Green St STE 100,<br />
                                    Bensenville, IL 60106<br />
                                    Ph# (847)616-1080&nbsp;&nbsp;Fax# (847)616-8811
                                </div>
                            </div>
                        </td>
                        <td style={{ ...cell, width: '42%', padding: 8 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                                <strong style={{ fontSize: 16 }}>{title}</strong>
                                <span style={{ fontSize: 9.5 }}>Date : {formatDate(firstValue(data, ['createdAt', 'shipmentDate', 'bookingDate']))}</span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '72px minmax(0, 1fr)', alignItems: 'center', marginTop: 7 }}>
                                <span style={{ fontSize: 11 }}>Bar Code :</span>
                                <div className="shipment-barcode">
                                    {barcode ? <Barcode value={String(barcode)} format="CODE128" width={2.5} height={38} margin={0} displayValue={false} /> : null}
                                </div>
                            </div>
                            <div style={{ marginTop: 4, fontSize: 11 }}>RM PRO No : <strong style={{ marginLeft: 12, fontSize: 12 }}>{barcode}</strong></div>
                        </td>
                    </tr>
                </tbody>
            </table>

            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', marginTop: 26 }}>
                <tbody>
                    <tr>
                        <td style={{ ...heading, width: '50%', fontSize: 11, padding: '5px 7px' }}>SHIPPER</td>
                        <td style={{ ...heading, width: '50%', fontSize: 11, padding: '5px 7px' }}>CONSIGNEE</td>
                    </tr>
                    <tr>
                        <td style={{ ...cell, fontSize: 11 }}><strong>Bill To :</strong>&nbsp; {firstValue(data, ['customerName', 'customer'])}</td>
                        <td style={{ ...cell, fontSize: 11 }}><strong>Name :</strong>&nbsp; {consigneeName}</td>
                    </tr>
                    <tr>
                        <td style={{ ...cell, fontSize: 11 }}><strong>Name :</strong>&nbsp; R &amp; M TRUCKING CO</td>
                        <td style={{ ...cell, fontSize: 11 }}><strong>Address :</strong>&nbsp; {consigneeAddress}</td>
                    </tr>
                    <tr>
                        <td style={{ ...cell, fontSize: 11 }}><strong>Address :</strong>&nbsp; 840 E GREEN ST STE 100</td>
                        <td style={{ ...cell, fontSize: 11 }}><strong>City/State/Zip :</strong>&nbsp; {consigneeCity}</td>
                    </tr>
                    <tr>
                        <td style={{ ...cell, fontSize: 11 }}><strong>City/State/Zip :</strong>&nbsp; BENSENVILLE, IL 60106&nbsp;&nbsp;&nbsp; <strong>Contact :</strong></td>
                        <td style={{ ...cell, fontSize: 11 }}><strong>Contact :</strong>&nbsp; {consigneeContact}</td>
                    </tr>
                </tbody>
            </table>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                <div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                        <tbody>
                            <tr><td style={{ ...heading, width: '23%' }}>Total<br />No of Pieces</td><td style={{ ...heading, width: '34%' }}>Total<br />Weight</td><td style={{ ...heading, width: '43%' }}>Total<br />No of Warehouse Receipt</td></tr>
                            <tr><td style={{ ...cell, height: 43, textAlign: 'center', fontWeight: 700 }}>{totalPieces}</td><td style={{ ...cell, textAlign: 'center', fontWeight: 700 }}>{totalWeight}</td><td style={{ ...cell, textAlign: 'center', fontWeight: 700 }}>{receipts.length}</td></tr>
                            <tr><td style={{ ...cell, height: 22 }} colSpan={1}>Booking #</td><td style={cell} colSpan={2}>{firstValue(data, ['booking', 'bookingNumber'])}</td></tr>
                            <tr><td style={{ ...cell, height: 22, fontSize: 10 }} colSpan={1}>Customer Ref #</td><td style={{ ...cell, fontSize: 9 }} colSpan={2}>{firstValue(data, ['customerRefNumber', 'additionalRefNumber', 'airBillNumber', 'billNumber'])}</td></tr>
                            <tr><td style={{ ...cell, height: 22 }} colSpan={1}>MISC</td><td style={cell} colSpan={2}>{firstValue(data, ['additionalRefNumber', 'additionalRefNo'])}</td></tr>
                            <tr><td style={heading} colSpan={3}>RECEIVED IN GOOD ORDER EXCEPT AS NOTED</td></tr>
                            <tr><td style={{ ...cell, height: 80 }} colSpan={3}>{firstValue(data, ['receivedConditionNotes', 'conditionNotes'])}</td></tr>
                            <tr><td style={cell}>Received By</td><td style={cell} colSpan={2}>{firstValue(data, ['receivedBy'])}</td></tr>
                            <tr><td style={cell}>Date</td><td style={cell} colSpan={2}></td></tr>
                            <tr><td style={cell}>Time</td><td style={cell} colSpan={2}></td></tr>
                        </tbody>
                    </table>
                </div>
                <div>
                    <table style={{ width: '100%', height: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                        <tbody>
                            <tr><td style={heading} colSpan={3}>SPECIAL INSTRUCTIONS / REMARKS</td></tr>
                            <tr><td style={{ ...cell, height: 177, whiteSpace: 'pre-wrap' }} colSpan={3}>{instructions}</td></tr>
                            <tr><td style={{ ...cell, width: '34%' }}>Forwarder</td><td style={{ ...cell, width: '33%' }}>Time IN</td><td style={{ ...cell, width: '33%' }}>Time OUT</td></tr>
                            <tr><td style={cell}>Airline</td><td style={cell}>Time IN</td><td style={cell}>Time OUT</td></tr>
                            <tr><td style={heading} colSpan={3}>DRIVER NUMBER &amp; INITIALS</td></tr>
                            <tr><td style={{ ...cell, height: 52 }} colSpan={3}>{firstValue(data, ['driverNumber', 'driverName', 'driver'])}</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div style={{ border, borderTop: 0, padding: '10px 16px', textAlign: 'center', fontSize: 10, lineHeight: 1.5 }}>
                <strong>SUBJECT TO ALL GOVERNING TARIFFS PUBLISHED BY R&amp;M TRUCKING, INC.</strong>
                <div style={{ marginTop: 13, fontSize: 12 }}>The Liability of R&amp;M Trucking including negligence is limited to the sum of 8.50 cents per pound or $250 maximum unless a greater valuation shall be paid for or agreed to be pay in writing prior to shipping by emailing info@rmtrucking.com Visit www.rmtrucking.com for our governing provisions.</div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <tbody>
                    <tr>
                        <td style={heading} colSpan={2}>WAREHOUSE RECEIPT ID&apos;S</td>
                        <td style={heading} colSpan={2}>CONTAINER NUMBER</td>
                    </tr>
                    {Array.from({ length: 10 }, (_, rowIndex) => {
                        const pageOffset = pageIndex * 20;
                        return (
                            <tr key={rowIndex}>
                                <td style={{ ...cell, width: '25%', height: 20, padding: '2px 5px', lineHeight: 1.1 }}>{valueOrBlank(receiptNumbers[pageOffset + rowIndex])}</td>
                                <td style={{ ...cell, width: '25%', height: 20, padding: '2px 5px', lineHeight: 1.1 }}>{valueOrBlank(receiptNumbers[pageOffset + 10 + rowIndex])}</td>
                                <td style={{ ...cell, width: '25%', height: 20, padding: '2px 5px', lineHeight: 1.1 }}>{valueOrBlank(containerNumbers[pageOffset + rowIndex])}</td>
                                <td style={{ ...cell, width: '25%', height: 20, padding: '2px 5px', lineHeight: 1.1 }}>{valueOrBlank(containerNumbers[pageOffset + 10 + rowIndex])}</td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
                </div>
            ))}
        </div>
    );
});

ShipmentPrintTemplate.displayName = 'ShipmentPrintTemplate';

ShipmentPrintTemplate.propTypes = {
    data: PropTypes.object,
    type: PropTypes.string,
};

export default ShipmentPrintTemplate;
