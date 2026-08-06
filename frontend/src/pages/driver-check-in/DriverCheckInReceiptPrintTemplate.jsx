import React from 'react';
import { createPortal } from 'react-dom';
import { Box, Typography } from '@mui/material';
import Barcode from 'react-barcode';
import RMLogo from '../../assets/RM.png';

const RECEIPTS_PER_PAGE = 10;
const displayValue = (value) => value ?? '';

function PrintField({ label, value, secondaryValue, last = false }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '85px 1fr', alignItems: 'center', minHeight: 40, px: 1.25, py: 0.25, boxSizing: 'border-box', borderBottom: last ? 'none' : '1px solid #bbb' }}>
      <Typography sx={{ fontSize: '11px', lineHeight: 1.1 }}>{label} :</Typography>
      <Box>
        <Typography sx={{ fontSize: '14px', lineHeight: 1.1, fontWeight: 700, overflowWrap: 'anywhere' }}>{value}</Typography>
        {secondaryValue && <Typography sx={{ fontSize: '14px', lineHeight: 1.1, fontWeight: 700, overflowWrap: 'anywhere' }}>{secondaryValue}</Typography>}
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
          @page { 
            size: A4 portrait; 
            margin: 0.2in; 
          }
          html, body {
            height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }
          /* Completely strip standard page layout flow height */
          body > *:not(.driver-check-in-receipt-print) {
            display: none !important;
          }
          body * { 
            visibility: hidden; 
          }
          .driver-check-in-receipt-print, 
          .driver-check-in-receipt-print * { 
            visibility: visible !important; 
          }
          .driver-check-in-receipt-print { 
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            margin: 0 !important; 
            padding: 0 !important; 
          }
        }
      `}</style>
      <Box className="driver-check-in-receipt-print" sx={{ display: 'none', '@media print': { display: 'block', width: '100%', bgcolor: '#fff', color: '#000', fontFamily: 'Arial, sans-serif' } }}>
        {pages.map((pageReceipts, pageIndex) => {
          const isLastPage = pageIndex === pages.length - 1;

          return (
            <Box 
              key={pageIndex} 
              sx={{ 
                boxSizing: 'border-box', 
                width: '100%',
                display: 'flex', 
                flexDirection: 'column', 
                pageBreakAfter: isLastPage ? 'avoid' : 'always',
                breakAfter: isLastPage ? 'avoid' : 'page',
                pageBreakInside: 'avoid',
                breakInside: 'avoid'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', mb: 0.75 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1.5 }}>
                  <img src={RMLogo} alt="RM Trucking Logo" style={{ width: '120px', height: '55px', objectFit: 'contain' }} />
                  <Typography sx={{ fontSize: '10px', lineHeight: 1.2, fontWeight: 700, pb: 0.25 }}>
                    840 E Green St STE 100,<br />Bensenville, IL 60106<br />Ph# (847) 616-1080&nbsp;&nbsp;Fax# (847) 616-8811
                  </Typography>
                </Box>
                <Typography sx={{ fontSize: '10px', pb: 0.25 }}>Page No :&nbsp;&nbsp;&nbsp;<strong>{String(pageIndex + 1).padStart(2, '0')}/{String(pages.length).padStart(2, '0')}</strong></Typography>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                {pageReceipts.map((receipt) => {
                  const receiptNumber = String(displayValue(receipt.receiptNumber));
                  return (
                    <Box key={receipt.receiptId ?? receiptNumber} sx={{ display: 'grid', gridTemplateColumns: '32% 28% 40%', minHeight: 80, border: '1px solid #222', borderRadius: '4px', overflow: 'hidden', breakInside: 'avoid' }}>
                      <Box sx={{ display: 'grid', gridTemplateRows: '1fr 1fr', borderRight: '1px solid #aaa' }}>
                        <PrintField label="Receipt No" value={receiptNumber} />
                        <PrintField label="Customer" value={displayValue(receipt.customerName)} secondaryValue={displayValue(receipt.stationName)} last />
                      </Box>
                      <Box sx={{ display: 'grid', gridTemplateRows: '1fr 1fr', borderRight: '1px solid #aaa' }}>
                        <PrintField label="Pro Number" value={displayValue(receipt.proNumber)} />
                        <PrintField label="Carrier" value={displayValue(receipt.carrierName)} last />
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', p: 0.5 }}>
                        {receiptNumber && <Barcode value={receiptNumber} format="CODE128" width={2.8} height={50} margin={0} fontSize={13} textMargin={2} displayValue />}
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