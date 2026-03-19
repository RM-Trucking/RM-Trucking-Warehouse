const convertLocalToET = (date) => {
 
  // if (date === '') {
  //   return ''; // Return empty string if input date is empty
  // }

  const currentDate = new Date(date);

  // if (Number.isNaN(currentDate)) {
  //   return ''; // Return empty string if the date is invalid
  // }

   const TIME_STAMP = import.meta.env.VITE_TIME_STAMP || 'ET';
  let etTime;
  if (TIME_STAMP === 'ET') {
    etTime = currentDate.toLocaleString('en-US', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit',
    minute: '2-digit'});
  }
  return `${etTime}`;
};
export default convertLocalToET;
