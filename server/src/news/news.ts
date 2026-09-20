import axios from "axios";
import Parser from "rss-parser";
import { NewsItem } from "../interfaces";
import { newsFeedUrl, newsSource } from "../config";

export async function getNewsHtml(): Promise<string> {
    if (newsSource.mode === "image") return getNewsImageHtml();
    const noNews = `<div class="no-news">No news found</div>`;
    const newItems = newsSource.mode === "api" ? await getApiNewsItems() : await getNewsItems();
    if (newItems.length === 0) return noNews;
    return newItems.map(({ title, imageUrl }) => {
        return `
    <div class="news-item">
        ${getImageDiv(imageUrl)}
        <div class="news-title">${title}</div>
    </div>
        `
    }).join('')
}

function getImageDiv(imageUrl: string) {
    if (imageUrl.length === 0) return '<div class="image-container-empty"></div>';
    else return `
    <div class="image-container">
        <img src="${imageUrl}">
    </div>
    `
}

/**
 * Image mode: the news box shows a single image fetched from the configured url,
 * scaled to fit the box (grayscale like the rss images).
 */
function getNewsImageHtml(): string {
    if (!newsSource.imageUrl) return `<div class="no-news">No news image configured</div>`;
    return `<div class="news-image"><img src="${newsSource.imageUrl}"></div>`;
}

async function getNewsItems(): Promise<NewsItem[]> {
    let parser = new Parser();
    try {
        const feed = await parser.parseURL(newsFeedUrl);
        return feed.items.slice(0, 4).map(item => {
            return {
                title: item.title,
                imageUrl: extractImageURL(item["content:encoded"])

            }
        })
    } catch (error) {
        console.error('Error fetching news', error);
        return [];
    }
}

/**
 * Api mode: fetch a json document and read the news items from it. Which list and which
 * fields are used is configured in newsSource (itemsPath, titleField, imageField), so any
 * json api can be used without changing the code.
 */
async function getApiNewsItems(): Promise<NewsItem[]> {
    try {
        const response = await axios.get(newsSource.apiUrl, { timeout: 10000 });
        const items = getPath(response.data, newsSource.itemsPath);
        if (!Array.isArray(items)) {
            console.error(`News api did not return a list at "${newsSource.itemsPath}"`);
            return [];
        }
        return items.slice(0, 4).map(item => {
            return {
                title: escapeHtml(String(item?.[newsSource.titleField] ?? '')),
                imageUrl: newsSource.imageField ? String(item?.[newsSource.imageField] ?? '') : ''
            }
        }).filter(item => item.title.length > 0);
    } catch (error) {
        console.error('Error fetching news from api', error);
        return [];
    }
}

/**
 * Resolve a dot separated path ("data.items") in a json document. An empty path returns the document itself.
 */
function getPath(data: unknown, path: string): unknown {
    if (!path) return data;
    return path.split('.').reduce<unknown>((value, key) => {
        return value && typeof value === 'object' ? (value as Record<string, unknown>)[key] : undefined;
    }, data);
}

function escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Extract the image URL from the encoded content. Currently only supports CDATA with embedded img tag.
 * @param htmlContent the content to extract the image from
 * @returns the image URL or an empty string if no image was found
 */
function extractImageURL(htmlContent: string): string {
    if (!htmlContent) {
        return '';
    }
    const match = htmlContent.match(/<img[^>]+src="([^">]+)"/);
    if (match && match.length > 1) {
        return match[1];
    }
    return '';
}
