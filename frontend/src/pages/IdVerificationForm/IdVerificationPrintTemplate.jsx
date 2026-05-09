import React from 'react';
import { createPortal } from 'react-dom';
import { Box, Typography } from '@mui/material';
import RMLogo from '../../assets/RM.png';

const ROWS_PER_PAGE = 10;

const DISCLAIMER_TEXT = `AT TIME OF ACCEPTANCE, AN IAC EMPLOYEE OR AUTHORIZED REPRESENTATIVE MUST REQUEST AND CHECK A VALID FORM OF ID FROM EACH INDIVIDUAL TENDERING THE CARGO FOR TRANSPORT ON A PASSENGER AIRCRAFT. AN EXPIRED ID IS NOT VALID FOR THE PURPOSES OF THIS CHECK.
SELECT ONE OF THE FOLLOWING THREE OPTIONS AS A VALID FORM OF ID:

1. OPTION 1: A PHOTO ID ISSUED BY A GOVERNMENT AUTHORITY OR A SIDA ID ISSUED BY AN AIRPORT OPERATOR WITHIN THE UNITED STATES. THE IAC EMPLOYEE OR AUTHORIZED REPRESENTATIVE MUST VERIFY THE ID IS A TRUE REPRESENTATION OF THE INDIVIDUAL; OR,
2. OPTION 2: A PHOTO ID ISSUED BY A COMPANY FOR WHICH THE INDIVIDUAL TENDERING THE CARGO IS AN EMPLOYEE OR AUTHORIZED REPRESENTATIVE. THE IAC EMPLOYEE OR AUTHORIZED REPRESENTATIVE MUST VERIFY THE ID IS A TRUE REPRESENTATION OF THE INDIVIDUAL; OR,
3. OPTION 3: TWO OTHER FORMS OF ID, AT LEAST ONE OF WHICH MUST BE ISSUED BY A GOVERNMENT AUTHORITY.

NO SPACES MUST BE LEFT BLANK. THE TERMS "NONE" OR "N/A" MUST BE USED TO INDICATE OMITTED INFORMATION.
IF THIS MEASURE IS NOT MET, THE IAC MUST REFUSE TO ACCEPT THE CARGO AND FOLLOW THE TSA NOTIFICATION PROCEDURES IN ACCORDANCE WITH CHAPTER 7 OF THE IACSSP. THE IAC MUST MAINTAIN ALL REQUIRED ID INFORMATION AT THE ACCEPTING STATION FOR A MINIMUM OF 30 CALENDAR DAYS FROM THE DATE THE CARGO WAS TRANSPORTED FROM THAT STATION AND MAKE THE ID INFORMATION AVAILABLE TO TSA UPON REQUEST. UNAUTHORIZED DISCLOSURE OF THE ID INFORMATION IS STRICTLY PROHIBITED.`;

const getSignatureSrc = (signature) => {
  if (!signature || typeof signature !== 'string') return '';

  const trimmedSignature = signature.trim();
  if (!trimmedSignature) return '';

  if (/^(data:image\/|https?:\/\/|blob:)/i.test(trimmedSignature)) {
    return trimmedSignature;
  }

  const compactSignature = trimmedSignature.replace(/\s/g, '');

  if (/^iVBORw0KGgo/i.test(compactSignature)) {
    return `data:image/png;base64,${compactSignature}`;
  }

  if (/^\/9j\//i.test(compactSignature)) {
    return `data:image/jpeg;base64,${compactSignature}`;
  }

  if (/^R0lGOD/i.test(compactSignature)) {
    return `data:image/gif;base64,${compactSignature}`;
  }

  if (/^UklGR/i.test(compactSignature)) {
    return `data:image/webp;base64,${compactSignature}`;
  }

  return trimmedSignature;
};

export default function IdVerificationPrintTemplate({ data }) {
  if (!data) return null;

  // 1. Chunk the freight details into pages of exactly 10 rows
  const freightRows = data.freightDetails || [];
  const pages = [];

  for (let i = 0; i < freightRows.length; i += ROWS_PER_PAGE) {
    const chunk = freightRows.slice(i, i + ROWS_PER_PAGE);

    // Pad the chunk with empty rows if it has less than 10 items
    while (chunk.length < ROWS_PER_PAGE) {
      chunk.push({ isEmpty: true });
    }
    pages.push(chunk);
  }

  // Fallback if there are absolutely no rows
  if (pages.length === 0) {
    pages.push(Array(ROWS_PER_PAGE).fill({ isEmpty: true }));
  }

  const totalPages = pages.length;
  const signatureSrc = getSignatureSrc(data.signature);

  // We define the template as a variable so we can inject it via Portal
  const printContent = (
    <>
      <style>
        {`
          @media print {
            /* Control browser margins to maximize space on a single page */
            @page {
              size: A4 portrait;
              margin: 0.3in;
            }
            /* Hide the normal app structure */
            body * {
              visibility: hidden;
            }
            /* Ensure our portal content is visible */
            .print-container, .print-container * {
              visibility: visible !important;
            }
            /* Position the portal at the absolute top left of the page */
            .print-container {
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
            }
          }
        `}
      </style>
      <Box
        className="print-container"
        sx={{
          display: 'none',
          '@media print': {
            display: 'block',
            bgcolor: 'white',
            color: 'black',
            width: '100%',
          }
        }}
      >
        {pages.map((pageRows, pageIndex) => (
          <Box
            key={pageIndex}
            sx={{
              pageBreakAfter: pageIndex < totalPages - 1 ? 'always' : 'auto',
              boxSizing: 'border-box',
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              minHeight: '98vh' // Ensures the wrapper spans the full height of the printable page area
            }}
          >
            {/* --- HEADER --- */}
       <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 4 }}>
  {/* Left Side - Logo and Company Info */}
  <Box sx={{ flex: 1 }}>
    <Box sx={{ mb: 1 }}>
      <img
        src={RMLogo}
        alt="RM Trucking Logo"
        style={{ height: '90px', marginBottom: '5px', objectFit: 'contain' }}
      />
    </Box>
    <Typography sx={{ fontSize: '14px', lineHeight: 1.5, fontWeight: 700, color: '#000' }}>
      840 E Green St STE 100,<br />
      Bensenville, IL 60106<br />
      Ph# (847) 616-1080 Fax# (847) 616-8811
    </Typography>
  </Box>

  {/* Right Side - Info Fields (Styled like the 2nd image) */}
  <Box sx={{ 
    flex: 1.2, 
    backgroundColor: '#cccccc', // Solid grey background
    borderRadius: '8px', 
    padding: '8px 12px',
    border: '1px solid #b0b0b0'
  }}>
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      
      {/* Row Helper for the first 4 rows */}
      {[
        { label: 'ID Verification No :', value: data.verificationId },
        { label: 'Date :', value: data.date },
        { label: 'Delivering Carrier :', value: data.carrier },
        { label: 'Freight Forwarder :', value: data.freightForwarder }
      ].map((row, index) => (
        <Box 
          key={index} 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            py: '5px',
            borderBottom: '1px solid #999' // Row dividers
          }}
        >
          <Typography sx={{ width: '135px', fontSize: '11px', fontWeight: 600, color: '#333' }}>
            {row.label}
          </Typography>
          <Box sx={{ 
            flex: 1, 
            backgroundColor: '#ffffff', 
            borderRadius: '4px', 
            padding: '4px 8px', 
            fontSize: '12px', 
            fontWeight: 800, // Thick font for the IDs
            minHeight: '20px',
            display: 'flex',
            alignItems: 'center'
          }}>
            {row.value}
          </Box>
        </Box>
      ))}

      {/* Final Row: Door and Page No */}
      <Box sx={{ display: 'flex', alignItems: 'center', pt: '5px' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
          <Typography sx={{ width: '135px', fontSize: '11px', fontWeight: 600, color: '#333' }}>
            Door :
          </Typography>
          <Box sx={{ 
            width: '60px', 
            backgroundColor: '#ffffff', 
            borderRadius: '4px', 
            padding: '4px 8px', 
            fontSize: '12px', 
            fontWeight: 800,
            textAlign: 'left'
          }}>
            {data.door}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontSize: '11px', fontWeight: 600, color: '#333' }}>
            Page No :
          </Typography>
          <Box sx={{ 
            width: '70px', 
            backgroundColor: '#ffffff', 
            borderRadius: '4px', 
            padding: '4px 8px', 
            fontSize: '12px', 
            fontWeight: 800,
            textAlign: 'center'
          }}>
            {String(pageIndex + 1).padStart(2, '0')}/{String(totalPages).padStart(2, '0')}
          </Box>
        </Box>
      </Box>

    </Box>
  </Box>
</Box>

            {/* --- FREIGHT FORWARDER TABLE --- */}
            <Box sx={{ mb: 1.5, border: '1px solid #ccc', borderRadius: 1, overflow: 'hidden' }}>
              <div style={{ backgroundColor: '#d9d9d9', padding: '8px 16px', borderBottom: '1px solid #ccc' }}>
                <Typography sx={{ fontSize: '11px', fontWeight: 700 }}>
                  Freight Forwarder - {data.freightForwarder}
                </Typography>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #ccc', backgroundColor: '#d0d0d0' }}>
                    <th style={{ padding: '8px 16px', fontWeight: 600, width: '5%', backgroundColor: '#d0d0d0' }}>SNo</th>
                    <th style={{ padding: '8px 16px', fontWeight: 600, width: '25%', backgroundColor: '#d0d0d0' }}>PRO #</th>
                    <th style={{ padding: '8px 16px', fontWeight: 600, width: '15%', backgroundColor: '#d0d0d0' }}>Pieces</th>
                    <th style={{ padding: '8px 16px', fontWeight: 600, width: '20%', backgroundColor: '#d0d0d0' }}>Weight (lbs)</th>
                    <th style={{ padding: '8px 16px', fontWeight: 600, width: '35%', backgroundColor: '#d0d0d0' }}>Shipper</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row, idx) => (
                    <tr key={idx} style={{ borderBottom: idx === 9 ? 'none' : '1px solid #e0e0e0', height: '28px' }}>
                      <td style={{ padding: '2px 16px' }}>{!row.isEmpty ? String(idx + 1).padStart(2, '0') : ''}</td>
                      <td style={{ padding: '2px 16px', fontWeight: 700 }}>{!row.isEmpty ? row.pro : ''}</td>
                      <td style={{ padding: '2px 16px' }}>{!row.isEmpty ? row.pieces : ''}</td>
                      <td style={{ padding: '2px 16px' }}>{!row.isEmpty ? row.weight : ''}</td>
                      <td style={{ padding: '2px 16px' }}>{!row.isEmpty ? row.shipper : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>

            {/* --- DISCLAIMER --- */}
            <Typography sx={{ fontSize: '10.5px', whiteSpace: 'pre-wrap', mb: 0, lineHeight: 1.1 }}>
              {DISCLAIMER_TEXT}
            </Typography>

            {/* --- DRIVER DETAILS --- */}
         <Box
  sx={{
    border: '1px solid #999',
    borderRadius: 1,
    p: 2.5,
    position: 'relative',
    mt: 1,
    backgroundColor: '#fff',
  }}
>
  {/* <Typography
    sx={{
      position: 'absolute',
      top: -10,
      left: 16,
      bgcolor: 'white',
      px: 1,
      fontSize: '12px',
      fontWeight: 800,
    }}
  >
    Driver Details
  </Typography> */}

  {/* CSS Grid explicitly forces 3 columns: Labels (1.5fr), Inputs (1fr), Checkboxes (1.2fr) */}
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: '1.5fr 1fr 1.2fr',
      rowGap: 2.5,
      columnGap: 2,
      alignItems: 'flex-end',
    }}
  >
    {/* ROW 1: Driver Name & Signature */}
    <Box>
      <Typography sx={{ fontSize: '10px', color: '#d32f2f', fontWeight: 600, mb: 0.5 }}>
        Driver Name *
      </Typography>
      <Box sx={{ borderBottom: '1px solid #666', pb: 0.5, fontSize: '12px', fontWeight: 600, minHeight: '18px' }}>
        {data.driverName}
      </Box>
    </Box>
    <Box sx={{ alignSelf: 'flex-start' }}>
      <Box
        sx={{
          width: '120px',
          height: '40px',
          border: '1px dashed #999',
          borderRadius: 1,
          bgcolor: '#f5f5f5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {signatureSrc ? (
          <img src={signatureSrc} alt="Signature" style={{ maxHeight: '90%', maxWidth: '90%' }} />
        ) : (
          <Typography sx={{ fontSize: '10px', color: '#999' }}>Signature</Typography>
        )}
      </Box>
    </Box>
    <Box /> {/* Empty 3rd column for Row 1 */}

    {/* ROW 2: First ID */}
    <Typography sx={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', lineHeight: 1.3 }}>
      Type of First ID Reviewed. (Government Issued ID or Company Issued)
    </Typography>
    <Box sx={{ borderBottom: '1px solid #666', pb: 0.5, fontSize: '11px', fontWeight: 600, minHeight: '18px' }}>
      {data.firstIdType || 'IL_DL'}
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 0.5 }}>
      <Box sx={{ width: 14, height: 14, border: '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px' }}>
        {data.firstIdMatch && <span style={{ fontSize: '10px', fontWeight: 'bold' }}>✓</span>}
      </Box>
      <Typography sx={{ fontSize: '9px', fontWeight: 800 }}>MATCHING PHOTO ON ID</Typography>
    </Box>

    {/* ROW 3: Second ID */}
    <Typography sx={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', lineHeight: 1.3 }}>
      Type of Second ID Reviewed (If the first id was not a photo id issued by a government authority or is not a company id)
    </Typography>
    <Box sx={{ borderBottom: '1px solid #666', pb: 0.5, fontSize: '11px', fontWeight: 600, minHeight: '18px' }}>
      {data.secondIdType || 'NA'}
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 0.5 }}>
      <Box sx={{ width: 14, height: 14, border: '2px solid #000', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '2px' }}>
        {data.secondIdMatch && <span style={{ fontSize: '10px', fontWeight: 'bold' }}>✓</span>}
      </Box>
      <Typography sx={{ fontSize: '9px', fontWeight: 800 }}>MATCHING PHOTO ON ID</Typography>
    </Box>

    {/* ROW 4: Shipper Name */}
    <Typography sx={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', lineHeight: 1.3 }}>
      Shipper's Company Name (Where Applicable)
    </Typography>
    <Box sx={{ borderBottom: '1px solid #666', pb: 0.5, fontSize: '11px', fontWeight: 600, minHeight: '18px' }}>
      {data.shipperCompany || 'Seacoast Logistics'}
    </Box>
    <Box /> {/* Empty 3rd column for Row 4 */}

    {/* ROW 5: Employee Name */}
    <Typography sx={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', lineHeight: 1.3 }}>
      Name of employee or authorized representative who verified ID information
    </Typography>
    <Box sx={{ borderBottom: '1px solid #666', pb: 0.5, fontSize: '11px', fontWeight: 600, minHeight: '18px' }}>
      {data.verifiedBy || 'Kevin'}
    </Box>
    <Box /> {/* Empty 3rd column for Row 5 */}
  </Box>
</Box>
          </Box>
        ))}
      </Box>
    </>
  );

  // Inject the template directly into the HTML body to escape all parent styles/margins
  return typeof document !== 'undefined' ? createPortal(printContent, document.body) : null;
}
