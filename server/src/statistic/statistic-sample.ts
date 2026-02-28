import axios from 'axios';

interface FrankfurterResponse {
    amount: number;
    base: string;
    date: string;
    rates: Record<string, number>;
}

export async function getStatisticHtml(): Promise<string> {
    try {
        const response = await axios.get<FrankfurterResponse>(
            'https://api.frankfurter.app/latest?base=EUR&symbols=USD',
            { timeout: 10000 }
        );
        const rate = response.data.rates['USD'];
        return buildStatisticHtml('EUR / USD', rate.toFixed(4));
    } catch (error) {
        console.error('Error fetching statistic:', error);
        return buildStatisticHtml('EUR / USD', 'N/A');
    }
}

function buildStatisticHtml(title: string, value: string): string {
    return `<div class="statistic-tile">
  <div class="statistic-tile-title">${title}</div>
  <div class="statistic-tile-value">${value}</div>
</div>`;
}
