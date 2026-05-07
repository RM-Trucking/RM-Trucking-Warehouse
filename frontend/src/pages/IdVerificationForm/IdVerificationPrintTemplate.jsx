// import React from 'react';
// import { createPortal } from 'react-dom';
// import { Box, Typography, Stack, Grid } from '@mui/material';
// import RMLogo from '../../assets/RM.png';

// const ROWS_PER_PAGE = 10;

// const DISCLAIMER_TEXT = `AT TIME OF ACCEPTANCE, AN IAC EMPLOYEE OR AUTHORIZED REPRESENTATIVE MUST REQUEST AND CHECK A VALID FORM OF ID FROM EACH INDIVIDUAL TENDERING THE CARGO FOR TRANSPORT ON A PASSENGER AIRCRAFT. AN EXPIRED ID IS NOT VALID FOR THE PURPOSES OF THIS CHECK.
// SELECT ONE OF THE FOLLOWING THREE OPTIONS AS A VALID FORM OF ID:

// 1. OPTION 1: A PHOTO ID ISSUED BY A GOVERNMENT AUTHORITY OR A SIDA ID ISSUED BY AN AIRPORT OPERATOR WITHIN THE UNITED STATES. THE IAC EMPLOYEE OR AUTHORIZED REPRESENTATIVE MUST VERIFY THE ID IS A TRUE REPRESENTATION OF THE INDIVIDUAL; OR,
// 2. OPTION 2: A PHOTO ID ISSUED BY A COMPANY FOR WHICH THE INDIVIDUAL TENDERING THE CARGO IS AN EMPLOYEE OR AUTHORIZED REPRESENTATIVE. THE IAC EMPLOYEE OR AUTHORIZED REPRESENTATIVE MUST VERIFY THE ID IS A TRUE REPRESENTATION OF THE INDIVIDUAL; OR,
// 3. OPTION 3: TWO OTHER FORMS OF ID, AT LEAST ONE OF WHICH MUST BE ISSUED BY A GOVERNMENT AUTHORITY.

// NO SPACES MUST BE LEFT BLANK. THE TERMS "NONE" OR "N/A" MUST BE USED TO INDICATE OMITTED INFORMATION.
// IF THIS MEASURE IS NOT MET, THE IAC MUST REFUSE TO ACCEPT THE CARGO AND FOLLOW THE TSA NOTIFICATION PROCEDURES IN ACCORDANCE WITH CHAPTER 7 OF THE IACSSP. THE IAC MUST MAINTAIN ALL REQUIRED ID INFORMATION AT THE ACCEPTING STATION FOR A MINIMUM OF 30 CALENDAR DAYS FROM THE DATE THE CARGO WAS TRANSPORTED FROM THAT STATION AND MAKE THE ID INFORMATION AVAILABLE TO TSA UPON REQUEST. UNAUTHORIZED DISCLOSURE OF THE ID INFORMATION IS STRICTLY PROHIBITED.`;

// export default function IdVerificationPrintTemplate({ data }) {
//   if (!data) return null;

//   // 1. Chunk the freight details into pages of exactly 10 rows
//   const freightRows = data.freightDetails || [];
//   const pages = [];

//   for (let i = 0; i < freightRows.length; i += ROWS_PER_PAGE) {
//     const chunk = freightRows.slice(i, i + ROWS_PER_PAGE);

//     // Pad the chunk with empty rows if it has less than 10 items
//     while (chunk.length < ROWS_PER_PAGE) {
//       chunk.push({ isEmpty: true });
//     }
//     pages.push(chunk);
//   }

//   // Fallback if there are absolutely no rows
//   if (pages.length === 0) {
//     pages.push(Array(ROWS_PER_PAGE).fill({ isEmpty: true }));
//   }

//   const totalPages = pages.length;

//   // We define the template as a variable so we can inject it via Portal
//   const printContent = (
//     <>
//       <style>
//         {`
//           @media print {
//             /* Control browser margins to maximize space on a single page */
//             @page {
//               size: portrait;
//               margin: 0.3in;
//             }
//             /* Hide the normal app structure */
//             body * {
//               visibility: hidden;
//             }
//             /* Ensure our portal content is visible */
//             .print-container, .print-container * {
//               visibility: visible !important;
//             }
//             /* Position the portal at the absolute top left of the page */
//             .print-container {
//               position: absolute !important;
//               top: 0 !important;
//               left: 0 !important;
//               width: 100% !important;
//               margin: 0 !important;
//               padding: 0 !important;
//             }
//           }
//         `}
//       </style>
//       <Box
//         className="print-container"
//         sx={{
//           display: 'none',
//           '@media print': {
//             display: 'block',
//             bgcolor: 'white',
//             color: 'black',
//             width: '100%',
//           }
//         }}
//       >
//         {pages.map((pageRows, pageIndex) => (
//           <Box
//             key={pageIndex}
//             sx={{
//               pageBreakAfter: pageIndex < totalPages - 1 ? 'always' : 'auto',
//               boxSizing: 'border-box',
//               margin: 0
//             }}
//           >
//             {/* --- HEADER --- */}
//             <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
//               {/* Left Side - Logo and Company Info */}
//               <Box sx={{ flex: 1 }}>
//                 <Box sx={{ mb: 1 }}>
//                   {/* RM Logo Image */}
//                   <img
//                     src={RMLogo}
//                     alt="RM Trucking Logo"
//                     style={{ height: '60px', marginBottom: '8px', objectFit: 'contain' }}
//                   />
//                 </Box>
//                 <Typography sx={{ fontSize: '9px', lineHeight: 1.3, fontWeight: 500 }}>
//                   840 E Green St STE 100,<br />
//                   Bensenville, IL 60106<br />
//                   Ph# (847)616-1080 Fax# (847)616-8811
//                 </Typography>
//               </Box>

//               {/* Right Side - Info Fields Table */}
//               <Box sx={{ flex: 1, border: '2px solid #999', borderRadius: 0.5, bgcolor: '#e8e8e8', overflow: 'hidden' }}>
//                 <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 0, fontSize: '9px' }}>
//                   {/* Row 1: ID Verification No */}
//                   <Box sx={{ bgcolor: '#c0c0c0', px: 2, py: 1.5, fontWeight: 600, display: 'flex', alignItems: 'center', borderRight: '1px solid #999', borderBottom: '1px solid #999' }}>
//                     ID Verification No :
//                   </Box>
//                   <Box sx={{ bgcolor: '#fff', px: 2, py: 1.5, borderBottom: '1px solid #999', display: 'flex', alignItems: 'center' }}>
//                     {data.verificationId}
//                   </Box>

//                   {/* Row 2: Date */}
//                   <Box sx={{ bgcolor: '#c0c0c0', px: 2, py: 1.5, fontWeight: 600, display: 'flex', alignItems: 'center', borderRight: '1px solid #999', borderBottom: '1px solid #999' }}>
//                     Date :
//                   </Box>
//                   <Box sx={{ bgcolor: '#fff', px: 2, py: 1.5, borderBottom: '1px solid #999', display: 'flex', alignItems: 'center' }}>
//                     {data.date}
//                   </Box>

//                   {/* Row 3: Delivering Carrier */}
//                   <Box sx={{ bgcolor: '#c0c0c0', px: 2, py: 1.5, fontWeight: 600, display: 'flex', alignItems: 'center', borderRight: '1px solid #999', borderBottom: '1px solid #999' }}>
//                     Delivering Carrier :
//                   </Box>
//                   <Box sx={{ bgcolor: '#fff', px: 2, py: 1.5, borderBottom: '1px solid #999', display: 'flex', alignItems: 'center' }}>
//                     {data.carrier}
//                   </Box>

//                   {/* Row 4: Freight Forwarder */}
//                   <Box sx={{ bgcolor: '#c0c0c0', px: 2, py: 1.5, fontWeight: 600, display: 'flex', alignItems: 'center', borderRight: '1px solid #999', borderBottom: '1px solid #999' }}>
//                     Freight Forwarder :
//                   </Box>
//                   <Box sx={{ bgcolor: '#fff', px: 2, py: 1.5, borderBottom: '1px solid #999', display: 'flex', alignItems: 'center' }}>
//                     {data.freightForwarder}
//                   </Box>

//                   {/* Row 5: Door and Page No */}
//                   <Box sx={{ bgcolor: '#c0c0c0', px: 2, py: 1.5, fontWeight: 600, display: 'flex', alignItems: 'center', borderRight: '1px solid #999' }}>
//                     Door :
//                   </Box>
//                   <Box sx={{ bgcolor: '#fff', px: 2, py: 1.5, display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'space-between' }}>
//                     <Box sx={{ flex: 1 }}>
//                       {data.door}
//                     </Box>
//                     <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '8px', fontWeight: 600 }}>
//                       <span>Page No :</span>
//                       <span sx={{ minWidth: '25px', textAlign: 'center' }}>{String(pageIndex + 1).padStart(2, '0')}/{String(totalPages).padStart(2, '0')}</span>
//                     </Box>
//                   </Box>
//                 </Box>
//               </Box>
//             </Box>

//             {/* --- FREIGHT FORWARDER TABLE --- */}
//             <Box sx={{ mb: 1.5, border: '1px solid #ccc', borderRadius: 1, overflow: 'hidden' }}>
//               <Box sx={{ bgcolor: '#d9d9d9', px: 2, py: 0.5, borderBottom: '1px solid #ccc' }}>
//                 <Typography sx={{ fontSize: '11px', fontWeight: 700 }}>
//                   Freight Forwarder - {data.freightForwarder}
//                 </Typography>
//               </Box>
//               <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', textAlign: 'left' }}>
//                 <thead>
//                   <tr style={{ borderBottom: '1px solid #ccc' }}>
//                     <th style={{ padding: '6px 16px', fontWeight: 600, width: '5%' }}>SNo</th>
//                     <th style={{ padding: '6px 16px', fontWeight: 600, width: '25%' }}>PRO #</th>
//                     <th style={{ padding: '6px 16px', fontWeight: 600, width: '15%' }}>Pieces</th>
//                     <th style={{ padding: '6px 16px', fontWeight: 600, width: '20%' }}>Weight (lbs)</th>
//                     <th style={{ padding: '6px 16px', fontWeight: 600, width: '35%' }}>Shipper</th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {pageRows.map((row, idx) => (
//                     <tr key={idx} style={{ borderBottom: idx === 9 ? 'none' : '1px solid #e0e0e0', height: '22px' }}>
//                       <td style={{ padding: '2px 16px' }}>{!row.isEmpty ? String(idx + 1).padStart(2, '0') : ''}</td>
//                       <td style={{ padding: '2px 16px', fontWeight: 700 }}>{!row.isEmpty ? row.pro : ''}</td>
//                       <td style={{ padding: '2px 16px' }}>{!row.isEmpty ? row.pieces : ''}</td>
//                       <td style={{ padding: '2px 16px' }}>{!row.isEmpty ? row.weight : ''}</td>
//                       <td style={{ padding: '2px 16px' }}>{!row.isEmpty ? row.shipper : ''}</td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </Box>

//             {/* --- DISCLAIMER --- */}
//             <Typography sx={{ fontSize: '7px', whiteSpace: 'pre-wrap', mb: 1.5, lineHeight: 1.2 }}>
//               {DISCLAIMER_TEXT}
//             </Typography>

//             {/* --- DRIVER DETAILS --- */}
//             <Box sx={{ border: '1px solid #ccc', borderRadius: 1, p: 1.5, position: 'relative', pt: 2.5 }}>
//               <Typography 
//                 sx={{ 
//                   position: 'absolute', top: -10, left: 16, bgcolor: 'white', px: 1, 
//                   fontSize: '11px', fontWeight: 700 
//                 }}
//               >
//                 Driver Details
//               </Typography>

//               <Stack spacing={1}>
//                 {/* Name and Signature */}
//                 <Grid container spacing={2} alignItems="flex-end">
//                   <Grid item xs={6}>
//                     <Typography sx={{ fontSize: '9px', color: '#d32f2f', mb: 0.5 }}>Driver Name *</Typography>
//                     <Box sx={{ borderBottom: '1px solid #000', pb: 0.25, minHeight: '16px', fontSize: '11px', fontWeight: 600 }}>
//                       {data.driverName}
//                     </Box>
//                   </Grid>
//                   <Grid item xs={6}>
//                     <Box sx={{ 
//                       height: 40, width: 200, border: '1px dashed #ccc', bgcolor: '#f5f5f5', 
//                       display: 'flex', alignItems: 'center', justifyContent: 'center' 
//                     }}>
//                       {data.signature ? (
//                          <img src={data.signature} alt="Signature" style={{ maxHeight: '100%', maxWidth: '100%' }} />
//                       ) : (
//                          <Typography sx={{ fontSize: '10px', color: '#999' }}>Signature</Typography>
//                       )}
//                     </Box>
//                   </Grid>
//                 </Grid>

//                 {/* First ID */}
//                 <Grid container spacing={2} alignItems="flex-end">
//                   <Grid item xs={5}>
//                     <Typography sx={{ fontSize: '9px' }}>TYPE OF FIRST ID REVIEWED. (GOVERNMENT ISSUED ID OR COMPANY ISSUED)</Typography>
//                   </Grid>
//                   <Grid item xs={4}>
//                      <Box sx={{ borderBottom: '1px solid #000', pb: 0.25, minHeight: '16px', fontSize: '11px' }}>
//                       {data.firstIdType}
//                      </Box>
//                   </Grid>
//                   <Grid item xs={3}>
//                     <Typography sx={{ fontSize: '9px', display: 'flex', alignItems: 'center' }}>
//                       <span style={{ fontSize: '12px', marginRight: '4px' }}>{data.firstIdMatch ? '☑' : '☐'}</span> MATCHING PHOTO ON ID
//                     </Typography>
//                   </Grid>
//                 </Grid>

//                 {/* Second ID */}
//                 <Grid container spacing={2} alignItems="flex-end">
//                   <Grid item xs={5}>
//                     <Typography sx={{ fontSize: '9px' }}>TYPE OF SECOND ID REVIEWED (IF THE FIRST ID WAS NOT A PHOTO ID ISSUED BY A GOVERNMENT AUTHORITY OR IS NOT A COMPANY ID)</Typography>
//                   </Grid>
//                   <Grid item xs={4}>
//                      <Box sx={{ borderBottom: '1px solid #000', pb: 0.25, minHeight: '16px', fontSize: '11px' }}>
//                       {data.secondIdType}
//                      </Box>
//                   </Grid>
//                   <Grid item xs={3}>
//                     <Typography sx={{ fontSize: '9px', display: 'flex', alignItems: 'center' }}>
//                       <span style={{ fontSize: '12px', marginRight: '4px' }}>{data.secondIdMatch ? '☑' : '☐'}</span> MATCHING PHOTO ON ID
//                     </Typography>
//                   </Grid>
//                 </Grid>

//                  {/* Shipper Company */}
//                  <Grid container spacing={2} alignItems="flex-end">
//                   <Grid item xs={5}>
//                     <Typography sx={{ fontSize: '9px' }}>SHIPPER'S COMPANY NAME (WHERE APPLICABLE)</Typography>
//                   </Grid>
//                   <Grid item xs={4}>
//                      <Box sx={{ borderBottom: '1px solid #000', pb: 0.25, minHeight: '16px', fontSize: '11px' }}>
//                       {data.shipperCompany}
//                      </Box>
//                   </Grid>
//                 </Grid>

//                 {/* Verifier */}
//                 <Grid container spacing={2} alignItems="flex-end">
//                   <Grid item xs={5}>
//                     <Typography sx={{ fontSize: '9px' }}>NAME OF EMPLOYEE OR AUTHORIZED REPRESENTATIVE WHO VERIFIED ID INFORMATION</Typography>
//                   </Grid>
//                   <Grid item xs={4}>
//                      <Box sx={{ borderBottom: '1px solid #000', pb: 0.25, minHeight: '16px', fontSize: '11px' }}>
//                       {data.verifiedBy}
//                      </Box>
//                   </Grid>
//                 </Grid>

//               </Stack>
//             </Box>
//           </Box>
//         ))}
//       </Box>
//     </>
//   );

//   // Inject the template directly into the HTML body to escape all parent styles/margins
//   return typeof document !== 'undefined' ? createPortal(printContent, document.body) : null;
// }

import React from 'react';
import { createPortal } from 'react-dom';
import { Box, Typography, Stack, Grid } from '@mui/material';
import RMLogo from '../../assets/RM.png';

const ROWS_PER_PAGE = 10;

const DISCLAIMER_TEXT = `AT TIME OF ACCEPTANCE, AN IAC EMPLOYEE OR AUTHORIZED REPRESENTATIVE MUST REQUEST AND CHECK A VALID FORM OF ID FROM EACH INDIVIDUAL TENDERING THE CARGO FOR TRANSPORT ON A PASSENGER AIRCRAFT. AN EXPIRED ID IS NOT VALID FOR THE PURPOSES OF THIS CHECK.
SELECT ONE OF THE FOLLOWING THREE OPTIONS AS A VALID FORM OF ID:

1. OPTION 1: A PHOTO ID ISSUED BY A GOVERNMENT AUTHORITY OR A SIDA ID ISSUED BY AN AIRPORT OPERATOR WITHIN THE UNITED STATES. THE IAC EMPLOYEE OR AUTHORIZED REPRESENTATIVE MUST VERIFY THE ID IS A TRUE REPRESENTATION OF THE INDIVIDUAL; OR,
2. OPTION 2: A PHOTO ID ISSUED BY A COMPANY FOR WHICH THE INDIVIDUAL TENDERING THE CARGO IS AN EMPLOYEE OR AUTHORIZED REPRESENTATIVE. THE IAC EMPLOYEE OR AUTHORIZED REPRESENTATIVE MUST VERIFY THE ID IS A TRUE REPRESENTATION OF THE INDIVIDUAL; OR,
3. OPTION 3: TWO OTHER FORMS OF ID, AT LEAST ONE OF WHICH MUST BE ISSUED BY A GOVERNMENT AUTHORITY.

NO SPACES MUST BE LEFT BLANK. THE TERMS "NONE" OR "N/A" MUST BE USED TO INDICATE OMITTED INFORMATION.
IF THIS MEASURE IS NOT MET, THE IAC MUST REFUSE TO ACCEPT THE CARGO AND FOLLOW THE TSA NOTIFICATION PROCEDURES IN ACCORDANCE WITH CHAPTER 7 OF THE IACSSP. THE IAC MUST MAINTAIN ALL REQUIRED ID INFORMATION AT THE ACCEPTING STATION FOR A MINIMUM OF 30 CALENDAR DAYS FROM THE DATE THE CARGO WAS TRANSPORTED FROM THAT STATION AND MAKE THE ID INFORMATION AVAILABLE TO TSA UPON REQUEST. UNAUTHORIZED DISCLOSURE OF THE ID INFORMATION IS STRICTLY PROHIBITED.`;

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
            <Box sx={{ mb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
              {/* Left Side - Logo and Company Info */}
              <Box sx={{ flex: 1 }}>
                <Box sx={{ mb: 1 }}>
                  {/* RM Logo Image */}
                  <img
                    src={RMLogo}
                    alt="RM Trucking Logo"
                    style={{ height: '60px', marginBottom: '8px', objectFit: 'contain' }}
                  />
                </Box>
                <Typography sx={{ fontSize: '9px', lineHeight: 1.3, fontWeight: 500 }}>
                  840 E Green St STE 100,<br />
                  Bensenville, IL 60106<br />
                  Ph# (847)616-1080 Fax# (847)616-8811
                </Typography>
              </Box>

              {/* Right Side - Info Fields Table */}
              <Box sx={{ flex: 1, border: '2px solid #999', borderRadius: 0.5, bgcolor: '#e8e8e8', overflow: 'hidden' }}>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 0, fontSize: '9px' }}>
                  {/* Row 1: ID Verification No */}
                  <Box sx={{ bgcolor: '#c0c0c0', px: 2, py: 1.5, fontWeight: 600, display: 'flex', alignItems: 'center', borderRight: '1px solid #999', borderBottom: '1px solid #999' }}>
                    ID Verification No :
                  </Box>
                  <Box sx={{ bgcolor: '#fff', px: 2, py: 1.5, borderBottom: '1px solid #999', display: 'flex', alignItems: 'center' }}>
                    {data.verificationId}
                  </Box>

                  {/* Row 2: Date */}
                  <Box sx={{ bgcolor: '#c0c0c0', px: 2, py: 1.5, fontWeight: 600, display: 'flex', alignItems: 'center', borderRight: '1px solid #999', borderBottom: '1px solid #999' }}>
                    Date :
                  </Box>
                  <Box sx={{ bgcolor: '#fff', px: 2, py: 1.5, borderBottom: '1px solid #999', display: 'flex', alignItems: 'center' }}>
                    {data.date}
                  </Box>

                  {/* Row 3: Delivering Carrier */}
                  <Box sx={{ bgcolor: '#c0c0c0', px: 2, py: 1.5, fontWeight: 600, display: 'flex', alignItems: 'center', borderRight: '1px solid #999', borderBottom: '1px solid #999' }}>
                    Delivering Carrier :
                  </Box>
                  <Box sx={{ bgcolor: '#fff', px: 2, py: 1.5, borderBottom: '1px solid #999', display: 'flex', alignItems: 'center' }}>
                    {data.carrier}
                  </Box>

                  {/* Row 4: Freight Forwarder */}
                  <Box sx={{ bgcolor: '#c0c0c0', px: 2, py: 1.5, fontWeight: 600, display: 'flex', alignItems: 'center', borderRight: '1px solid #999', borderBottom: '1px solid #999' }}>
                    Freight Forwarder :
                  </Box>
                  <Box sx={{ bgcolor: '#fff', px: 2, py: 1.5, borderBottom: '1px solid #999', display: 'flex', alignItems: 'center' }}>
                    {data.freightForwarder}
                  </Box>

                  {/* Row 5: Door and Page No */}
                  <Box sx={{ bgcolor: '#c0c0c0', px: 2, py: 1.5, fontWeight: 600, display: 'flex', alignItems: 'center', borderRight: '1px solid #999' }}>
                    Door :
                  </Box>
                  <Box sx={{ bgcolor: '#fff', px: 2, py: 1.5, display: 'flex', gap: 2, alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ flex: 1 }}>
                      {data.door}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, fontSize: '8px', fontWeight: 600 }}>
                      <span>Page No :</span>
                      <span sx={{ minWidth: '25px', textAlign: 'center' }}>{String(pageIndex + 1).padStart(2, '0')}/{String(totalPages).padStart(2, '0')}</span>
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>

            {/* --- FREIGHT FORWARDER TABLE --- */}
            <Box sx={{ mb: 1.5, border: '1px solid #ccc', borderRadius: 1, overflow: 'hidden' }}>
              <Box sx={{ bgcolor: '#d9d9d9', px: 2, py: 0.5, borderBottom: '1px solid #ccc' }}>
                <Typography sx={{ fontSize: '11px', fontWeight: 700 }}>
                  Freight Forwarder - {data.freightForwarder}
                </Typography>
              </Box>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #ccc' }}>
                    <th style={{ padding: '6px 16px', fontWeight: 600, width: '5%' }}>SNo</th>
                    <th style={{ padding: '6px 16px', fontWeight: 600, width: '25%' }}>PRO #</th>
                    <th style={{ padding: '6px 16px', fontWeight: 600, width: '15%' }}>Pieces</th>
                    <th style={{ padding: '6px 16px', fontWeight: 600, width: '20%' }}>Weight (lbs)</th>
                    <th style={{ padding: '6px 16px', fontWeight: 600, width: '35%' }}>Shipper</th>
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
            <Typography sx={{ fontSize: '7px', whiteSpace: 'pre-wrap', mb: 1.5, lineHeight: 1.2 }}>
              {DISCLAIMER_TEXT}
            </Typography>

            {/* --- DRIVER DETAILS --- */}
            <Box 
              sx={{ 
                border: '1px solid #ccc', 
                borderRadius: 1, 
                p: 1.5, 
                position: 'relative', 
                pt: 2.5,
                mt: 'auto' // Pushes the driver details box to the absolute bottom of the container
              }}
            >
              <Typography 
                sx={{ 
                  position: 'absolute', top: -10, left: 16, bgcolor: 'white', px: 1, 
                  fontSize: '11px', fontWeight: 700 
                }}
              >
                Driver Details
              </Typography>

              <Stack spacing={1.5}>
                {/* Name and Signature */}
                <Grid container spacing={2} alignItems="flex-end">
                  <Grid item xs={6}>
                    <Typography sx={{ fontSize: '9px', color: '#d32f2f', mb: 0.5 }}>Driver Name *</Typography>
                    <Box sx={{ borderBottom: '1px solid #000', pb: 0.25, minHeight: '16px', fontSize: '11px', fontWeight: 600 }}>
                      {data.driverName}
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ 
                      height: 40, width: 200, border: '1px dashed #ccc', bgcolor: '#f5f5f5', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center' 
                    }}>
                      {data.signature ? (
                         <img src={data.signature} alt="Signature" style={{ maxHeight: '100%', maxWidth: '100%' }} />
                      ) : (
                         <Typography sx={{ fontSize: '10px', color: '#999' }}>Signature</Typography>
                      )}
                    </Box>
                  </Grid>
                </Grid>

                {/* First ID */}
                <Grid container spacing={2} alignItems="flex-end">
                  <Grid item xs={5}>
                    <Typography sx={{ fontSize: '9px' }}>TYPE OF FIRST ID REVIEWED. (GOVERNMENT ISSUED ID OR COMPANY ISSUED)</Typography>
                  </Grid>
                  <Grid item xs={4}>
                     <Box sx={{ borderBottom: '1px solid #000', pb: 0.25, minHeight: '16px', fontSize: '11px' }}>
                      {data.firstIdType}
                     </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography sx={{ fontSize: '9px', display: 'flex', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', marginRight: '4px' }}>{data.firstIdMatch ? '☑' : '☐'}</span> MATCHING PHOTO ON ID
                    </Typography>
                  </Grid>
                </Grid>

                {/* Second ID */}
                <Grid container spacing={2} alignItems="flex-end">
                  <Grid item xs={5}>
                    <Typography sx={{ fontSize: '9px' }}>TYPE OF SECOND ID REVIEWED (IF THE FIRST ID WAS NOT A PHOTO ID ISSUED BY A GOVERNMENT AUTHORITY OR IS NOT A COMPANY ID)</Typography>
                  </Grid>
                  <Grid item xs={4}>
                     <Box sx={{ borderBottom: '1px solid #000', pb: 0.25, minHeight: '16px', fontSize: '11px' }}>
                      {data.secondIdType}
                     </Box>
                  </Grid>
                  <Grid item xs={3}>
                    <Typography sx={{ fontSize: '9px', display: 'flex', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', marginRight: '4px' }}>{data.secondIdMatch ? '☑' : '☐'}</span> MATCHING PHOTO ON ID
                    </Typography>
                  </Grid>
                </Grid>

                 {/* Shipper Company */}
                 <Grid container spacing={2} alignItems="flex-end">
                  <Grid item xs={5}>
                    <Typography sx={{ fontSize: '9px' }}>SHIPPER'S COMPANY NAME (WHERE APPLICABLE)</Typography>
                  </Grid>
                  <Grid item xs={4}>
                     <Box sx={{ borderBottom: '1px solid #000', pb: 0.25, minHeight: '16px', fontSize: '11px' }}>
                      {data.shipperCompany}
                     </Box>
                  </Grid>
                </Grid>

                {/* Verifier */}
                <Grid container spacing={2} alignItems="flex-end">
                  <Grid item xs={5}>
                    <Typography sx={{ fontSize: '9px' }}>NAME OF EMPLOYEE OR AUTHORIZED REPRESENTATIVE WHO VERIFIED ID INFORMATION</Typography>
                  </Grid>
                  <Grid item xs={4}>
                     <Box sx={{ borderBottom: '1px solid #000', pb: 0.25, minHeight: '16px', fontSize: '11px' }}>
                      {data.verifiedBy}
                     </Box>
                  </Grid>
                </Grid>

              </Stack>
            </Box>
          </Box>
        ))}
      </Box>
    </>
  );

  // Inject the template directly into the HTML body to escape all parent styles/margins
  return typeof document !== 'undefined' ? createPortal(printContent, document.body) : null;
}