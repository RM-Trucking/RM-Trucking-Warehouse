import { Helmet } from 'react-helmet-async';

// ----------------------------------------------------------------------

export default function Page500() {
  return (
    <>
      <Helmet>
        <title> 500 - Internal Server Error</title>
      </Helmet>
    </>
  );
}
