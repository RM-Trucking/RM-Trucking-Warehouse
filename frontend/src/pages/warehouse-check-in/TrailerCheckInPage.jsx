import WarehouseCheckInPage from './WarehouseCheckInPage';

export default function TrailerCheckInPage() {
  return (
    <WarehouseCheckInPage
      title="Warehouse Check-In / Trailer"
      showParcelOption={false}
      showTrailerFreightHeader
      draftKey="trailer"
    />
  );
}
