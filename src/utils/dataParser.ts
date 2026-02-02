import * as XLSX from 'xlsx';

export interface DataPoint {
  timestamp: Date;
  value: number; // Consumption in kWh or Price in snt/kWh
}

// Convert Excel serial date to JS Date
const excelDateToJS = (serial: number): Date => {
  // Excel epoch is December 30, 1899
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const fractionalDay = serial - Math.floor(serial);
  const totalSeconds = Math.floor(86400 * fractionalDay);
  return new Date((utcValue + totalSeconds) * 1000);
};

export const parseElectricityFile = async (file: File): Promise<DataPoint[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        // First try as JSON with headers
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (jsonData.length === 0) {
          return reject(new Error('Tiedosto on tyhjä.'));
        }

        const firstRow = jsonData[0];
        const keys = Object.keys(firstRow);

        // Handle consumption file: "Ajankohta", "Sähkönkulutus kWh"
        if (keys.some(k => k.includes('Ajankohta')) || keys.some(k => k.includes('Sähkönkulutus'))) {
          return resolve(parseConsumptionData(jsonData));
        }

        // Handle Fingrid Datahub format: 'Alkaa', 'Määrä'
        if (firstRow['Alkaa'] || firstRow['Start time']) {
          return resolve(parseFingridData(jsonData));
        }

        // Handle Sahkotin/Nord Pool format with proper headers
        if (firstRow['Time'] || firstRow['timestamp']) {
          return resolve(parseNordPoolData(jsonData));
        }

        // Try raw array format for files with metadata rows (like porssisahko.net)
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        const priceResult = parsePorssisahkoData(rawData);
        if (priceResult.length > 0) {
          return resolve(priceResult);
        }

        reject(new Error('Tuntematon tiedostomuoto. Tarkista sarakkeet.'));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
};

// Parse consumption: "Ajankohta", "Sähkönkulutus kWh"
const parseConsumptionData = (data: any[]): DataPoint[] => {
  return data.map(row => {
    const timeKey = Object.keys(row).find(k => k.includes('Ajankohta')) || 'Ajankohta';
    const valueKey = Object.keys(row).find(k => k.includes('Sähkönkulutus')) || 'Sähkönkulutus kWh';

    const timeVal = row[timeKey];
    const timestamp = typeof timeVal === 'number' ? excelDateToJS(timeVal) : new Date(timeVal);
    const value = parseFloat(row[valueKey] || '0');

    return {
      timestamp,
      value: isNaN(value) ? 0 : value
    };
  }).filter(dp => !isNaN(dp.timestamp.getTime()));
};

// Parse Fingrid Datahub: 'Alkaa', 'Määrä'
const parseFingridData = (data: any[]): DataPoint[] => {
  return data.map(row => {
    const timeStr = row['Alkaa'] || row['Start time'];
    const value = parseFloat(row['Määrä'] || row['Quantity'] || '0');
    return {
      timestamp: new Date(timeStr),
      value: isNaN(value) ? 0 : value
    };
  }).filter(dp => !isNaN(dp.timestamp.getTime()));
};

// Parse porssisahko.net format: raw array with header rows
const parsePorssisahkoData = (rawData: any[][]): DataPoint[] => {
  // Find the row with "Aika" header
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(10, rawData.length); i++) {
    const row = rawData[i];
    if (row && row[0] === 'Aika') {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    return [];
  }

  // Data starts after header row
  const dataRows = rawData.slice(headerRowIndex + 1);

  return dataRows.map(row => {
    const timeVal = row[0];
    const priceVal = row[1];

    if (timeVal === undefined || priceVal === undefined) {
      return null;
    }

    const timestamp = typeof timeVal === 'number' ? excelDateToJS(timeVal) : new Date(timeVal);
    const value = typeof priceVal === 'number' ? priceVal : parseFloat(priceVal || '0');

    return {
      timestamp,
      value: isNaN(value) ? 0 : value
    };
  }).filter((dp): dp is DataPoint => dp !== null && !isNaN(dp.timestamp.getTime()));
};

// Parse Nord Pool / Sahkotin: 'Time', 'Price'
const parseNordPoolData = (data: any[]): DataPoint[] => {
  return data.map(row => {
    const timeStr = row['Time'] || row['timestamp'];
    const value = parseFloat(row['Price'] || row['price'] || row['Value'] || '0');
    return {
      timestamp: new Date(timeStr),
      value: isNaN(value) ? 0 : value
    };
  }).filter(dp => !isNaN(dp.timestamp.getTime()));
};
