import { forwardRef } from 'react';
import PropTypes from 'prop-types';

const TAB_LABEL = {
    active: 'Airport Transfer',
    inactive: 'Ocean LCL Transfer',
    incomplete: 'Ocean FCL Transfer',
};

const border = '1px solid #000';
const cellStyle = { border, padding: '3px 5px', fontSize: '11px', verticalAlign: 'top' };
const labelStyle = { ...cellStyle, fontWeight: '700', background: '#000', color: '#fff', textAlign: 'center', fontSize: '10px' };
const today = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

const ShipmentPrintTemplate = forwardRef(({ data, type }, ref) => {
    const title = TAB_LABEL[type] || 'Airport Transfer';
    const rmProNo   = data?.rmNumber  || '—';
    const customer  = data?.customer  || '—';
    const station   = data?.station   || '—';
    const billNo    = data?.billNumber || '—';

    return (
        <div ref={ref} style={{ padding: '20px', fontFamily: 'Arial, sans-serif', fontSize: '11px', color: '#000', width: '780px', margin: '0 auto' }}>

            {/* ── TOP HEADER ── */}
            <table style={{ width: '100%', borderCollapse: 'collapse', border, marginBottom: 0 }}>
                <tbody>
                    <tr>
                        {/* Logo + Address */}
                        <td style={{ ...cellStyle, width: '50%', verticalAlign: 'middle', padding: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ background: '#A22', color: '#fff', fontWeight: '900', fontSize: '22px', padding: '6px 10px', lineHeight: 1, minWidth: '60px', textAlign: 'center' }}>
                                    <div>RM</div>
                                    <div style={{ fontSize: '8px', letterSpacing: '1px' }}>TRUCKING CO.</div>
                                </div>
                                <div style={{ fontSize: '11px' }}>
                                    <div style={{ fontWeight: '700' }}>840 E Green St STE 100,</div>
                                    <div>Bensenville, IL 60106</div>
                                    <div>Ph# (847)616-1080&nbsp;&nbsp;Fax# (847)616-8811</div>
                                </div>
                            </div>
                        </td>
                        {/* Title block */}
                        <td style={{ ...cellStyle, width: '50%', verticalAlign: 'top', padding: '6px 10px' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <tbody>
                                    <tr>
                                        <td style={{ fontSize: '15px', fontWeight: '800', paddingBottom: '4px' }}>{title}</td>
                                        <td style={{ textAlign: 'right', fontSize: '11px' }}>Date : {today}</td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontSize: '11px', paddingTop: '4px' }}>Bar Code :</td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div style={{ fontFamily: 'monospace', fontSize: '18px', letterSpacing: '2px', fontWeight: 'bold' }}>||| || |||| | |||</div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style={{ fontSize: '11px', paddingTop: '4px' }}>RM PRO No :</td>
                                        <td style={{ textAlign: 'right', fontWeight: '700', fontSize: '11px' }}>{rmProNo}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </td>
                    </tr>
                </tbody>
            </table>

            {/* ── SHIPPER / CONSIGNEE ── */}
            <table style={{ width: '100%', borderCollapse: 'collapse', border, borderTop: 'none' }}>
                <tbody>
                    <tr>
                        <td style={labelStyle} colSpan={2}>SHIPPER</td>
                        <td style={labelStyle} colSpan={2}>CONSIGNEE</td>
                    </tr>
                    <tr>
                        <td style={{ ...cellStyle, width: '12%' }}>Bill To :</td>
                        <td style={{ ...cellStyle, width: '38%', fontWeight: '700' }}>{customer}</td>
                        <td style={{ ...cellStyle, width: '12%' }}>Name :</td>
                        <td style={{ ...cellStyle, width: '38%' }}></td>
                    </tr>
                    <tr>
                        <td style={cellStyle}>Name :</td>
                        <td style={cellStyle}>R & M TRUCKING CO</td>
                        <td style={cellStyle}>Address :</td>
                        <td style={cellStyle}></td>
                    </tr>
                    <tr>
                        <td style={cellStyle}>Address :</td>
                        <td style={cellStyle}>840 W GREEN ST STE 100</td>
                        <td style={cellStyle}>City/State/Zip :</td>
                        <td style={cellStyle}></td>
                    </tr>
                    <tr>
                        <td style={cellStyle}>City/State/Zip :</td>
                        <td style={cellStyle}>BENSENVILLE, IL 60106&nbsp;&nbsp;&nbsp;Contact :</td>
                        <td style={cellStyle}>Contact :</td>
                        <td style={cellStyle}></td>
                    </tr>
                </tbody>
            </table>

            {/* ── PIECES / WEIGHT / RECEIPT TABLE ── */}
            <table style={{ width: '100%', borderCollapse: 'collapse', border, borderTop: 'none' }}>
                <tbody>
                    <tr>
                        <td style={{ ...labelStyle, width: '14%' }}>Total<br />No of Pieces</td>
                        <td style={{ ...labelStyle, width: '14%' }}>Total<br />Weight</td>
                        <td style={{ ...labelStyle, width: '20%' }}>Total<br />No of Warehouse Receipt</td>
                        <td style={{ ...labelStyle, width: '10%' }}>PPD/<br />COL</td>
                        <td style={{ ...labelStyle, width: '12%' }}>R & M<br />Charges</td>
                        <td style={{ ...labelStyle, width: '30%' }}>RECEIVED IN GOOD ORDER EXCEPT AS NOTED</td>
                    </tr>
                    <tr>
                        <td style={{ ...cellStyle, height: '22px' }}></td>
                        <td style={cellStyle}></td>
                        <td style={cellStyle}></td>
                        <td style={cellStyle}></td>
                        <td style={cellStyle}></td>
                        <td style={{ ...cellStyle, rowSpan: 4 }}></td>
                    </tr>
                    <tr>
                        <td style={{ ...cellStyle, height: '22px' }}></td>
                        <td style={cellStyle}></td>
                        <td style={cellStyle}></td>
                        <td style={cellStyle}></td>
                        <td style={cellStyle}></td>
                        <td style={cellStyle}></td>
                    </tr>
                    <tr>
                        <td colSpan={2} style={cellStyle}>Booking #</td>
                        <td colSpan={3} style={cellStyle}></td>
                        <td style={cellStyle}></td>
                    </tr>
                    <tr>
                        <td colSpan={2} style={cellStyle}>Customer Ref #</td>
                        <td colSpan={3} style={cellStyle}>{billNo}</td>
                        <td style={cellStyle}></td>
                    </tr>
                    <tr>
                        <td colSpan={2} style={cellStyle}>MISC</td>
                        <td colSpan={4} style={cellStyle}></td>
                    </tr>
                </tbody>
            </table>

            {/* ── SPECIAL INSTRUCTIONS ── */}
            <table style={{ width: '100%', borderCollapse: 'collapse', border, borderTop: 'none' }}>
                <tbody>
                    <tr>
                        <td style={labelStyle} colSpan={4}>SPECIAL INSTRUCTIONS / REMARKS</td>
                    </tr>
                    <tr>
                        <td colSpan={4} style={{ ...cellStyle, height: '70px', verticalAlign: 'top', fontSize: '10px', lineHeight: '1.6' }}>
                            <strong>**Delivery Notes:**</strong><br />
                            - Contact Number: (555) 123-4567<br />
                            - Delivery Location: 123 Maple Street, Springfield, USA<br />
                            - Estimated Delivery Time: 3 PM - 5 PM<br />
                            - Driver: John Smith
                        </td>
                    </tr>
                    <tr>
                        <td style={{ ...cellStyle, width: '15%' }}>Forwarder</td>
                        <td style={{ ...cellStyle, width: '20%' }}>Time IN</td>
                        <td style={{ ...cellStyle, width: '20%' }}>Time OUT</td>
                        <td style={{ cellStyle, width: '45%', border, padding: '3px 5px' }}></td>
                    </tr>
                    <tr>
                        <td style={cellStyle}>Airline</td>
                        <td style={cellStyle}>Time IN</td>
                        <td style={cellStyle}>Time OUT</td>
                        <td style={{ border, padding: '3px 5px' }}></td>
                    </tr>
                </tbody>
            </table>

            {/* ── DRIVER / RECEIVED BY ── */}
            <table style={{ width: '100%', borderCollapse: 'collapse', border, borderTop: 'none' }}>
                <tbody>
                    <tr>
                        <td style={labelStyle} colSpan={2}>DRIVER NUMBER &amp; INITIALS</td>
                        <td style={{ ...cellStyle, width: '25%' }}>Received By</td>
                        <td style={{ ...cellStyle, width: '25%' }}></td>
                    </tr>
                    <tr>
                        <td style={{ ...cellStyle, height: '30px', width: '25%' }}></td>
                        <td style={{ ...cellStyle, width: '25%' }}></td>
                        <td style={cellStyle}>Date</td>
                        <td style={cellStyle}></td>
                    </tr>
                    <tr>
                        <td style={cellStyle}></td>
                        <td style={cellStyle}></td>
                        <td style={cellStyle}>Time</td>
                        <td style={cellStyle}></td>
                    </tr>
                </tbody>
            </table>

            {/* ── LEGAL FOOTER ── */}
            <div style={{ border, borderTop: 'none', padding: '6px 10px', fontSize: '9px', textAlign: 'center', lineHeight: '1.5' }}>
                <strong>SUBJECT TO ALL GOVERNING TARIFFS PUBLISHED BY R&amp;M TRUCKING, INC.</strong><br />
                The Liability of R&amp;M Trucking including negligence is limited to the sum of 8.50 cents per pound or $250 maximum unless a greater valuation shall be<br />
                paid for or agreed to be pay in writing prior to shipping by emailing info@rmtrucking.com<br />
                Visit www.rmtrucking.com for our governing provisions.
            </div>

            {/* ── WAREHOUSE / CONTAINER ── */}
            <table style={{ width: '100%', borderCollapse: 'collapse', border, borderTop: 'none', minHeight: '100px' }}>
                <tbody>
                    <tr>
                        <td style={labelStyle} colSpan={2}>WAREHOUSE RECEIPT ID&apos;S</td>
                        <td style={labelStyle} colSpan={2}>CONTAINER NUMBER</td>
                    </tr>
                    <tr>
                        <td colSpan={2} style={{ ...cellStyle, height: '80px', verticalAlign: 'top' }}></td>
                        <td colSpan={2} style={{ ...cellStyle, height: '80px', verticalAlign: 'top' }}></td>
                    </tr>
                </tbody>
            </table>

        </div>
    );
});

ShipmentPrintTemplate.displayName = 'ShipmentPrintTemplate';

ShipmentPrintTemplate.propTypes = {
    data: PropTypes.object,
    type: PropTypes.string,
};

export default ShipmentPrintTemplate;
