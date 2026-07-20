import React from 'react';
import { createPortal } from 'react-dom';
import { Box, Typography } from '@mui/material';
import Barcode from 'react-barcode';
import RMLogo from '../../assets/RM.png';

const RECEIPTS_PER_PAGE = 10;
const displayValue = (value) => value ?? '';

function PrintField({ label, value, secondaryValue, last = false }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '92px 1fr', alignItems: 'center', minHeight: 49, px: 1.5, py: 0.75, boxSizing: 'border-box', borderBottom: last ? 'none' : '1px solid #bbb' }}>
      <Typography sx={{ fontSize: '13px', lineHeight: 1.2 }}>{label} :</Typography>
      <Box>
        <Typography sx={{ fontSize: '17px', lineHeight: 1.15, fontWeight: 700, overflowWrap: 'anywhere' }}>{value}</Typography>
        {secondaryValue && <Typography sx={{ fontSize: '17px', lineHeight: 1.15, fontWeight: 700, overflowWrap: 'anywhere' }}>{secondaryValue}</Typography>}
      </Box>
    </Box>
  );
}

export default function DriverCheckInReceiptPrintTemplate({ receipts = [] }) {
  if (!receipts.length) return null;

  const pages = [];
  for (let index = 0; index < receipts.length; index += RECEIPTS_PER_PAGE) {
    pages.push(receipts.slice(index, index + RECEIPTS_PER_PAGE));
  }

  const printContent = (
    <>
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0.3in; }
          body * { visibility: hidden; }
          .driver-check-in-receipt-print, .driver-check-in-receipt-print * { visibility: visible !important; }
          .driver-check-in-receipt-print { position: absolute !important; top: 0 !important; left: 0 !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
        }
      `}</style>
      <Box className="driver-check-in-receipt-print" sx={{ display: 'none', '@media print': { display: 'block', width: '100%', bgcolor: '#fff', color: '#000', fontFamily: 'Arial, sans-serif' } }}>
        {pages.map((pageReceipts, pageIndex) => {
          const isFullPage = pageReceipts.length === RECEIPTS_PER_PAGE;

          return (
          <Box key={pageIndex} sx={{ boxSizing: 'border-box', height: isFullPage ? '11.09in' : 'auto', display: 'flex', flexDirection: 'column', pageBreakAfter: pageIndex < pages.length - 1 ? 'always' : 'auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mb: 1.25 }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2.5 }}>
                <img src={RMLogo} alt="RM Trucking Logo" style={{ width: '150px', height: '82px', objectFit: 'contain' }} />
                <Typography sx={{ fontSize: '12px', lineHeight: 1.35, fontWeight: 700, pb: 0.5 }}>
                  840 E Green St STE 100,<br />Bensenville, IL 60106<br />Ph# (847) 616-1080&nbsp;&nbsp;Fax# (847) 616-8811
                </Typography>
              </Box>
              <Typography sx={{ fontSize: '11px', pb: 0.5 }}>Page No :&nbsp;&nbsp;&nbsp;<strong>{String(pageIndex + 1).padStart(2, '0')}/{String(pages.length).padStart(2, '0')}</strong></Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', flex: isFullPage ? 1 : 'none', gap: 6 }}>
              {pageReceipts.map((receipt) => {
                const receiptNumber = String(displayValue(receipt.receiptNumber));
                return (
                  <Box key={receipt.receiptId ?? receiptNumber} sx={{ display: 'grid', gridTemplateColumns: '32% 28% 40%', flex: isFullPage ? 1 : 'none', minHeight: 100, border: '1px solid #222', borderRadius: '6px', overflow: 'hidden' }}>
                    <Box sx={{ display: 'grid', gridTemplateRows: '1fr 1fr', borderRight: '1px solid #aaa' }}>
                      <PrintField label="Receipt No" value={receiptNumber} />
                      <PrintField label="Customer" value={displayValue(receipt.customerName)} secondaryValue={displayValue(receipt.stationName)} last />
                    </Box>
                    <Box sx={{ display: 'grid', gridTemplateRows: '1fr 1fr', borderRight: '1px solid #aaa' }}>
                      <PrintField label="Pro Number" value={displayValue(receipt.proNumber)} />
                      <PrintField label="Carrier" value={displayValue(receipt.carrierName)} last />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {receiptNumber && <Barcode value={receiptNumber} format="CODE128" width={3.5} height={72} margin={0} fontSize={18} textMargin={3} displayValue />}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
          );
        })}
      </Box>
    </>
  );

  return typeof document !== 'undefined' ? createPortal(printContent, document.body) : null;
}
