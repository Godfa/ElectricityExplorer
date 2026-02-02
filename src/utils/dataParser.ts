import * as XLSX from 'xlsx';

export interface DataPoint {
  timestamp: Date;
  value: number; // Consumption in kWh or Price in snt/kWh
}

export const parseElectricityFile = async (file: File): Promise<DataPoint[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        // Handle Fingrid Datahub (Consumption)
        // Usually has columns like 'Alkaa', 'Päättyy', 'Määrä' or 'Start time', 'End time', 'Quantity'
        if (jsonData.length > 0 && (jsonData[0]['Alkaa'] || jsonData[0]['Start time'])) {
          return resolve(parseConsumptionData(jsonData));
        }

        // Handle Sahkotin/Nord Pool (Price)
        // Usually has columns like 'Time', 'Price' or 'Timestamp', 'Value'
        if (jsonData.length > 0 && (jsonData[0]['Time'] || jsonData[0]['timestamp'])) {
          return resolve(parsePriceData(jsonData));
        }

        reject(new Error('Tuntematon tiedostomuoto.'));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
};

const parseConsumptionData = (data: any[]): DataPoint[] => {
  return data.map(row => {
    const timeStr = row['Alkaa'] || row['Start time'];
    const value = parseFloat(row['Määrä'] || row['Quantity'] || '0');
    return {
      timestamp: new Date(timeStr),
      value: isNaN(value) ? 0 : value
    };
  }).filter(dp => !isNaN(dp.timestamp.getTime()));
};

const parsePriceData = (data: any[]): DataPoint[] => {
  return data.map(row => {
    const timeStr = row['Time'] || row['timestamp'];
    const value = parseFloat(row['Price'] || row['price'] || row['Value'] || '0');
    return {
      timestamp: new Date(timeStr),
      value: isNaN(value) ? 0 : value
    };
  }).filter(dp => !isNaN(dp.timestamp.getTime()));
};
