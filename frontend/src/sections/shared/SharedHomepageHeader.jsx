import PropTypes from 'prop-types';
import { Box, Stack, Typography, Button } from '@mui/material';
// ----------------------------------------------------------------------


SharedHomePageHeader.propTypes = {
  title : PropTypes.string,
  buttonText : PropTypes.string,
  onButtonClick : PropTypes.func,
};

export default function SharedHomePageHeader({title, buttonText, onButtonClick}) {
  return (
    <>
    <Box width = '100%'>
      <Stack flexDirection={'row'} alignItems={'center'} justifyContent={'space-between'} sx={{padding : 2}}>
        <Typography variant='subtitle1' sx={{fontWeight : 700}}>{title}</Typography>
        {buttonText && <Button sx={{bgcolor : '#A22', color : "#fff", textTransform: 'none'}} onClick={onButtonClick}>{buttonText}</Button>}
      </Stack>
      </Box>
    </>
  );
}
