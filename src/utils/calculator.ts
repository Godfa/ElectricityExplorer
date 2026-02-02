import { DataPoint } from './dataParser';

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
    // Map prices for fast lookup (ISO string as key)
    const priceMap = new Map<string, number>();
    prices.forEach(p => {
        // Round to nearest hour to match consumption
        const d = new Date(p.timestamp);
        d.setMinutes(0, 0, 0);
        priceMap.set(d.toISOString(), p.value);
    });

    let spotTotal = 0;
    let fixedTotal = 0;
    const hourlyDiffs: DataPoint[] = [];
    const monthlyMap = new Map<string, { spot: number; fixed: number }>();

    consumption.forEach(c => {
        const d = new Date(c.timestamp);
        d.setMinutes(0, 0, 0);
        const iso = d.toISOString();
        const spotPrice = priceMap.get(iso);

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
