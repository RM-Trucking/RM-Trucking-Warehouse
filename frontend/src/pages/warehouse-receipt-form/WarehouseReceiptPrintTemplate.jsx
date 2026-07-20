import { createPortal } from 'react-dom';
import { Box, Typography } from '@mui/material';
import RMLogo from '../../assets/RM.png';

const ROWS_PER_PAGE = 20;
const INCH_TO_METER = 0.0254;
const isYes = (value) => ['Y', 'YES', 'TRUE', '1'].includes(String(value ?? '').trim().toUpperCase());
const valueOrBlank = (value) => value ?? '';
const formatDecimalValue = (value) => {
  if (value === undefined || value === null || value === '') return '';
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return value;
  return numberValue.toFixed(2);
};
const getItemCubicMeter = (item = {}) => {
  const cubicMeter = item.cubicMeter;
  const cbm = item.cbm;
  const hasDimensions = [item.length, item.width, item.height].every(
    (value) => value !== undefined && value !== null && value !== '' && Number.isFinite(Number(value))
  );

  if (hasDimensions) {
    const calculatedCbm = Number(item.length) * INCH_TO_METER
      * Number(item.width) * INCH_TO_METER
      * Number(item.height) * INCH_TO_METER;

    if (calculatedCbm > 0) {
      return calculatedCbm;
    }
  }

  if (cubicMeter !== undefined && cubicMeter !== null && cubicMeter !== '' && Number(cubicMeter) !== 0) {
    return cubicMeter;
  }

  if (cbm !== undefined && cbm !== null && cbm !== '') {
    return cbm;
  }

  return cubicMeter ?? '';
};

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).split(' ')[0] || '';
  return date.toLocaleDateString('en-US');
};

const CheckValue = ({ checked }) => (
  <Box sx={{ width: 14, height: 14, border: '1px solid #111', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11.5, fontWeight: 900 }}>
    {checked ? '✓' : ''}
  </Box>
);

const InfoRow = ({ label, value }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: '44% 56%', minHeight: 22, borderBottom: '1px solid #bbb', alignItems: 'center' }}>
    <Typography sx={{ p: '3px 6px', fontSize: 11, fontWeight: 700, borderRight: '1px solid #bbb' }}>{label}</Typography>
    <Typography sx={{ p: '3px 6px', fontSize: 11, fontWeight: 500 }}>{valueOrBlank(value)}</Typography>
  </Box>
);

const ConditionRow = ({ label, checked, value, columns = '42% 58%', multiline = false, singleLine = false }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: columns, minHeight: multiline ? 50 : 22, borderBottom: '1px solid #bbb', alignItems: 'center' }}>
    <Typography sx={{ p: '3px 6px', fontSize: 11, lineHeight: 1.2, fontWeight: 700, borderRight: '1px solid #bbb', whiteSpace: multiline ? 'normal' : singleLine ? 'nowrap' : 'normal', overflowWrap: 'anywhere' }}>{label}</Typography>
    <Box sx={{ p: '3px 6px', minHeight: multiline ? 50 : 22, display: 'flex', alignItems: 'center' }}>
      {checked === undefined ? <Typography sx={{ fontSize: 11, lineHeight: 1.2, whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{valueOrBlank(value)}</Typography> : <CheckValue checked={checked} />}
    </Box>
  </Box>
);

const SplitItemTables = ({ rows, pageIndex }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.7 }}>
    {[rows.slice(0, 10), rows.slice(10, 20)].map((tableRows, tableIndex) => (
      <Box key={tableIndex} sx={{ border: '1px solid #aaa' }}>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', '& th, & td': { borderRight: '1px solid #aaa', borderBottom: '1px solid #aaa', px: 0.2, py: 0.15, textAlign: 'center', fontSize: 9, lineHeight: 1.15, wordBreak: 'break-word' }, '& thead tr': { height: 28 }, '& th': { bgcolor: '#ddd', fontWeight: 800, fontSize: 9.1, py: 0.35 } }}>
          <thead><tr><th>Item</th><th>Pcs</th><th>Type</th><th>Length</th><th>Width</th><th>Height</th><th>Weight</th><th style={{ fontSize: '8.75px' }}>CBM(m³)</th></tr></thead>
          <tbody>
            {tableRows.map((item, rowIndex) => {
              const itemNumber = pageIndex * ROWS_PER_PAGE + tableIndex * 10 + rowIndex + 1;
              return (
                <tr key={rowIndex} style={{ height: '22px' }}>
                  <td style={{ fontWeight: 700 }}>{!item.isEmpty ? itemNumber : ''}</td>
                  <td>{valueOrBlank(item.pieces)}</td>
                  <td>{valueOrBlank(item.type)}</td>
                  <td>{formatDecimalValue(item.length)}</td>
                  <td>{formatDecimalValue(item.width)}</td>
                  <td>{formatDecimalValue(item.height)}</td>
                  <td style={{ fontWeight: 700 }}>{formatDecimalValue(item.weight)}</td>
                  <td>{formatDecimalValue(getItemCubicMeter(item))}</td>
                </tr>
              );
            })}
          </tbody>
        </Box>
      </Box>
    ))}
  </Box>
);

function ReceiptPage({ receipt, rows, allRows, pageIndex, totalPages }) {
  const consignee = [receipt.customerName, receipt.stationName].filter(Boolean).join(' | ');
  const totalPieces = receipt.piecesInland ?? rows.reduce((sum, item) => sum + (Number(item.pieces) || 0), 0);
  const totalWeight = receipt.weightInland ?? rows.reduce((sum, item) => sum + (Number(item.weight) || 0), 0);
  const totalCbm = receipt.cubicMeter ?? receipt.cbm ?? allRows.reduce(
    (sum, item) => sum + (Number(getItemCubicMeter(item)) || 0),
    0
  );

  return (
    <Box
      sx={{
        pageBreakAfter: pageIndex < totalPages - 1 ? 'always' : 'auto',
        breakAfter: pageIndex < totalPages - 1 ? 'page' : 'auto',
        boxSizing: 'border-box',
        margin: 0,
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#fff',
        color: '#000',
      }}
    >
      {/* --- TOP ELEMENTS CONTEXT GRID --- */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.7 }}>
        
        {/* Header Block */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.05fr) minmax(0, 0.95fr)', gap: 1, mb: 0.5 }}>
          <Box>
            <Box component="img" src={RMLogo} alt="RM Trucking" sx={{ height: 70, objectFit: 'contain', mb: 0.3 }} />
            <Typography sx={{ fontSize: 12.5, lineHeight: 1.5, fontWeight: 700 }}>
              840 E Green St STE 100,<br />Bensenville, IL 60106<br />Ph# (847)616-1080&nbsp;&nbsp; Fax# (847)616-8811
            </Typography>
          </Box>
          <Box sx={{ bgcolor: '#fff', border: '1px solid #aaa', borderRadius: 1, p: 1.2 }}>
            <Typography sx={{ fontSize: 16, fontWeight: 800, pb: 0.7, mb: 0.5, borderBottom: '1px solid #999' }}>WAREHOUSE RECEIPT</Typography>
            {[
              ['Receipt No :', receipt.receiptNumber],
              ['Date :', formatDate(receipt.createdAt || receipt.receiptDate)],
              ['Received By :', receipt.receivedBy],
              ['Location :', receipt.location],
            ].map(([label, value]) => (
              <Box key={label} sx={{ display: 'grid', gridTemplateColumns: '38% 62%', alignItems: 'center', mb: 0.55 }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{label}</Typography>
                <Box sx={{ bgcolor: '#fff', borderRadius: 0.5, px: 0.8, py: 0.45, minHeight: 20, fontSize: 12.5, fontWeight: 800 }}>{valueOrBlank(value)}</Box>
              </Box>
            ))}
            <Box sx={{ display: 'grid', gridTemplateColumns: '38% 22% 22% 18%', alignItems: 'center' }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>Label Count :</Typography>
              <Box sx={{ bgcolor: '#fff', borderRadius: 0.5, px: 0.8, py: 0.45, minHeight: 20, fontSize: 12.5, fontWeight: 800 }}>{valueOrBlank(receipt.labelCount)}</Box>
              <Typography sx={{ pl: 0.6, fontSize: 12, fontWeight: 700 }}>Page No :</Typography>
              <Box sx={{ bgcolor: '#fff', borderRadius: 0.5, px: 0.5, py: 0.45, minHeight: 20, fontSize: 12.5, fontWeight: 800, textAlign: 'center' }}>{pageIndex + 1}/{totalPages}</Box>
            </Box>
          </Box>
        </Box>

        {/* Shipper & Consignee */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid #aaa' }}>
          <Box sx={{ borderRight: '1px solid #aaa' }}>
            <Typography sx={{ bgcolor: '#ddd', p: 0.7, textAlign: 'center', fontSize: 11, fontWeight: 800 }}>SHIPPER</Typography>
            <Typography sx={{ px: 0.8, py: 0.4, textAlign: 'left', minHeight: 22, fontSize: 11.5, fontWeight: 600 }}>{valueOrBlank(receipt.shipperName || receipt.shipper)}</Typography>
          </Box>
          <Box>
            <Typography sx={{ bgcolor: '#ddd', p: 0.7, textAlign: 'center', fontSize: 11, fontWeight: 800 }}>CONSIGNEE</Typography>
            <Typography sx={{ px: 0.8, py: 0.4, textAlign: 'left', minHeight: 22, fontSize: 11.5, fontWeight: 600 }}>{consignee}</Typography>
          </Box>
        </Box>

        {/* Inland Information */}
        <Box sx={{ border: '1px solid #aaa' }}>
          <Typography sx={{ bgcolor: '#ddd', p: 0.7, textAlign: 'center', fontSize: 11, fontWeight: 800 }}>INLAND INFORMATION</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <Box sx={{ borderRight: '1px solid #aaa' }}>
              <InfoRow label="CARRIER" value={receipt.carrierName || receipt.carrier} />
              <InfoRow label="PRO NUMBER" value={receipt.proNumber} />
              <InfoRow label="INVOICE NUMBER" value={receipt.invoiceNumber} />
              <InfoRow label="PO NUMBER" value={receipt.poNumber} />
              <InfoRow label="CUSTOMER REF NO" value={receipt.customerRefNumber} />
            </Box>
            <Box>
              <InfoRow label="PACKAGE ID" value={receipt.packageId} />
              <InfoRow label="PIECES (Customer Info)" value={totalPieces} />
              <InfoRow label="WEIGHT (Customer Info)" value={formatDecimalValue(totalWeight)} />
              <InfoRow label="RE WEIGHT" value={formatDecimalValue(receipt.reWeight ?? receipt.reweight)} />
              <InfoRow label="CBM (m³)" value={formatDecimalValue(totalCbm)} />
            </Box>
          </Box>
        </Box>

        <SplitItemTables rows={rows} pageIndex={pageIndex} />

        {/* Legacy full-width table retained only as a non-rendered reference. */}
        <Box sx={{ display: 'none', border: '1px solid #aaa' }}>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', '& th, & td': { borderRight: '1px solid #aaa', borderBottom: '1px solid #aaa', px: 0.5, py: 0.15, textAlign: 'center', fontSize: 11.5, lineHeight: 1.15 }, '& th': { bgcolor: '#ddd', fontWeight: 800, fontSize: 12 } }}>
            <thead><tr><th>Item</th><th>Pcs</th><th>Type</th><th>Length</th><th>Width</th><th>Height</th><th>Weight</th><th style={{ fontSize: '8.75px' }}>CBM(m³)</th></tr></thead>
            <tbody>
              {Array.from({ length: ROWS_PER_PAGE }, (_, index) => rows[index] || {}).map((item, index) => (
                <tr key={index} style={{ height: '18px' }}>
                  <td style={{ fontWeight: 700 }}>{item.freightId || !item.isEmpty ? pageIndex * ROWS_PER_PAGE + index + 1 : ''}</td>
                  <td>{valueOrBlank(item.pieces)}</td>
                  <td>{valueOrBlank(item.type)}</td>
                  <td>{formatDecimalValue(item.length)}</td>
                  <td>{formatDecimalValue(item.width)}</td>
                  <td>{formatDecimalValue(item.height)}</td>
                  <td style={{ fontWeight: 700 }}>{formatDecimalValue(item.weight)}</td>
                  <td>{formatDecimalValue(getItemCubicMeter(item))}</td>
                </tr>
              ))}
            </tbody>
          </Box>
        </Box>

        {/* Freight Information Block */}
        <Box sx={{ border: '1px solid #aaa' }}>
          <Typography sx={{ bgcolor: '#ddd', p: 0.7, textAlign: 'center', fontSize: 11, fontWeight: 800 }}>FREIGHT INFORMATION</Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <Box sx={{ borderRight: '1px solid #aaa' }}>
              <ConditionRow label="BANDED SKID" checked={isYes(receipt.bandedSkid)} columns="50% 50%" singleLine />
              <ConditionRow label="SHRINK WRAPPED SKID" checked={isYes(receipt.shrinkWrappedSkid)} columns="50% 50%" singleLine />
              <ConditionRow label="SHT / IPPC SKID" checked={isYes(receipt.shtIppcSkid)} columns="50% 50%" singleLine />
              <ConditionRow label="PLASTIC SKID" checked={isYes(receipt.plasticSkid)} columns="50% 50%" singleLine />
            </Box>
            <Box>
              <ConditionRow label="DOCUMENTS" checked={isYes(receipt.documents)} columns="50% 50%" singleLine />
              <ConditionRow label="BAD FREIGHT CONDITION" checked={isYes(receipt.freightCondition)} columns="50% 50%" singleLine />
              <ConditionRow label="FREIGHT CONDITION DESCRIPTION" value={receipt.handlingDescription} columns="50% 50%" multiline />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* --- BOTTOM STICKY HAZMAT ELEMENT GROUP --- */}
      <Box sx={{ border: '1px solid #aaa', mt: 0.7 }}>
        <Typography sx={{ bgcolor: '#ddd', p: 0.7, textAlign: 'center', fontSize: 11, fontWeight: 800 }}>HAZARDOUS MATERIAL</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
          <Box sx={{ borderRight: '1px solid #aaa' }}>
            <ConditionRow label="HAZMAT" checked={isYes(receipt.hazMat)} columns="50% 50%" />
            <ConditionRow label="ORIGINAL DGD" checked={isYes(receipt.originalDgd)} columns="50% 50%" />
            <ConditionRow label="UN NUMBER" value={Array.isArray(receipt.unNumber) ? receipt.unNumber.join(', ') : receipt.unNumber} columns="50% 50%" multiline />
            <ConditionRow label="CLASS" value={Array.isArray(receipt.class) ? receipt.class.join(', ') : receipt.class} columns="50% 50%" multiline />
          </Box>
          <Box>
            <ConditionRow label="PROPER SHIPPING NAME" value={receipt.properShippingName} columns="50% 50%" />
            <ConditionRow label="DESTINATION" value={receipt.destination || receipt.finalDestination} columns="50% 50%" />
            <ConditionRow label="DESCRIPTION" value={receipt.hazardousDescription} columns="50% 50%" multiline />
            <ConditionRow label="NOTES" value={receipt.notes} columns="50% 50%" multiline />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default function WarehouseReceiptPrintTemplate({ data, preview = false }) {
  if (!data) return null;
  const items = Array.isArray(data.freightInformation) ? data.freightInformation : [];
  
  const pages = [];
  for (let index = 0; index < Math.max(items.length, 1); index += ROWS_PER_PAGE) {
    const chunk = items.slice(index, index + ROWS_PER_PAGE);
    while (chunk.length < ROWS_PER_PAGE) {
      chunk.push({ isEmpty: true });
    }
    pages.push(chunk);
  }

  const content = pages.map((rows, index) => (
    <ReceiptPage key={index} receipt={data} rows={rows} allRows={items} pageIndex={index} totalPages={pages.length} />
  ));

  if (preview) return <>{content}</>;

  const printContent = (
    <>
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0.3in;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
          }
          body > *:not(.warehouse-receipt-print) {
            display: none !important;
          }
          body * {
            visibility: hidden;
          }
          .warehouse-receipt-print,
          .warehouse-receipt-print * {
            visibility: visible !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .warehouse-receipt-print {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
      <Box className="warehouse-receipt-print" sx={{ display: 'none', '@media print': { display: 'block' } }}>
        {content}
      </Box>
    </>
  );

  return typeof document !== 'undefined' ? createPortal(printContent, document.body) : null;
}
