import type { DataPoint } from './dataParser';

export interface ComparisonResult {
    spotTotal: number;
    fixedTotal: number;
    savings: number;
    monthlyData: MonthlyComparison[];
    hourlyDifferences: DataPoint[];
}

export interface MonthlyComparison {
    month: string;
    spotPrice: number;
    fixedPrice: number;
    savings: number;
    cumulativeSavings: number;
}

export const calculateComparison = (
    consumption: DataPoint[],
    prices: DataPoint[],
    fixedPriceSnt: number,
    marginSnt: number = 0.5 // Default margin
): ComparisonResult => {
    // Map prices for fast lookup by hour
    // Key format: "YYYY-MM-DD-HH" to avoid timezone issues
    const priceMap = new Map<string, number[]>();
    prices.forEach(p => {
        const d = new Date(p.timestamp);
        // Create key from year, month, day, hour (handles sub-hourly data)
        const key = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}-${d.getUTCHours()}`;
        const existing = priceMap.get(key) || [];
        existing.push(p.value);
        priceMap.set(key, existing);
    });

    // Average prices for each hour (for 15-min data)
    const hourlyPriceMap = new Map<string, number>();
    priceMap.forEach((values, key) => {
        hourlyPriceMap.set(key, values.reduce((a, b) => a + b, 0) / values.length);
    });

    let spotTotal = 0;
    let fixedTotal = 0;
    const hourlyDiffs: DataPoint[] = [];
    const monthlyMap = new Map<string, { spot: number; fixed: number }>();

    consumption.forEach(c => {
        const d = new Date(c.timestamp);
        // Try multiple timezone offsets (UTC, UTC+2, UTC+3 for Finland)
        const offsets = [0, 2, 3];
        let spotPrice: number | undefined;
        let matchedDate = d;

        for (const offset of offsets) {
            const adjusted = new Date(d.getTime() - offset * 60 * 60 * 1000);
            const key = `${adjusted.getUTCFullYear()}-${adjusted.getUTCMonth()}-${adjusted.getUTCDate()}-${adjusted.getUTCHours()}`;
            const price = hourlyPriceMap.get(key);
            if (price !== undefined) {
                spotPrice = price;
                matchedDate = adjusted;
                break;
            }
        }

        if (spotPrice !== undefined) {
            const spotCost = c.value * (spotPrice + marginSnt) / 100; // to €
            const fixedCost = c.value * fixedPriceSnt / 100; // to €

            spotTotal += spotCost;
            fixedTotal += fixedCost;

            hourlyDiffs.push({
                timestamp: d,
                value: fixedCost - spotCost
            });

            const monthKey = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}`;
            const current = monthlyMap.get(monthKey) || { spot: 0, fixed: 0 };
            monthlyMap.set(monthKey, {
                spot: current.spot + spotCost,
                fixed: current.fixed + fixedCost
            });
        }
    });

    let cumulativeSavings = 0;
    const monthlyData: MonthlyComparison[] = Array.from(monthlyMap.entries())
        .map(([month, data]) => ({
            month,
            spotPrice: data.spot,
            fixedPrice: data.fixed,
            savings: data.fixed - data.spot
        }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .map(item => {
            cumulativeSavings += item.savings;
            return { ...item, cumulativeSavings };
        });

    return {
        spotTotal,
        fixedTotal,
        savings: fixedTotal - spotTotal,
        monthlyData,
        hourlyDifferences: hourlyDiffs
    };
};
