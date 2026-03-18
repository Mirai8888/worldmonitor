import { loadFromStorage, saveToStorage } from '@/utils';

const STORAGE_KEY = 'wm-mcp-panels';
const PANEL_SPANS_KEY = 'worldmonitor-panel-spans';
const PANEL_COL_SPANS_KEY = 'worldmonitor-panel-col-spans';
const MAX_PANELS = 10;

export interface McpPreset {
  name: string;
  icon: string;
  description: string;
  serverUrl: string;
  authNote?: string;
  defaultTool?: string;
  defaultArgs?: Record<string, unknown>;
  defaultTitle?: string;
}

export const MCP_PRESETS: McpPreset[] = [
  {
    name: 'Brave Search',
    icon: '🔍',
    description: 'Real-time web search for news and events',
    serverUrl: 'https://mcp.bravesearch.com/mcp',
    authNote: 'Requires Authorization: Bearer <BRAVE_API_KEY>',
    defaultTool: 'web_search',
    defaultArgs: { query: 'geopolitical events today', count: 10 },
    defaultTitle: 'Brave Search',
  },
  {
    name: 'Exa Search',
    icon: '🧠',
    description: 'Semantic search for research and intelligence',
    serverUrl: 'https://mcp.exa.ai/mcp',
    authNote: 'Requires Authorization: Bearer <EXA_API_KEY>',
    defaultTool: 'search',
    defaultArgs: { query: 'conflict escalation 2025', numResults: 5 },
    defaultTitle: 'Exa Intel',
  },
  {
    name: 'Tavily Research',
    icon: '📡',
    description: 'AI-powered research and fact extraction',
    serverUrl: 'https://mcp.tavily.com/mcp',
    authNote: 'Requires Authorization: Bearer <TAVILY_API_KEY>',
    defaultTool: 'tavily_search',
    defaultArgs: { query: 'geopolitical risk analysis', search_depth: 'advanced' },
    defaultTitle: 'Tavily Research',
  },
  {
    name: 'Context7 Docs',
    icon: '📚',
    description: 'Library and framework documentation lookup',
    serverUrl: 'https://mcp.context7.com/mcp',
    defaultTool: 'get-library-docs',
    defaultArgs: { context7CompatibleLibraryID: '/vercel/next.js', topic: 'routing' },
    defaultTitle: 'Context7 Docs',
  },
  {
    name: 'Web Fetch',
    icon: '🌐',
    description: 'Fetch and extract content from any public URL',
    serverUrl: 'https://mcp-fetch.cloudflare.com/mcp',
    defaultTool: 'fetch',
    defaultArgs: { url: 'https://www.bbc.com/news/world', maxLength: 5000 },
    defaultTitle: 'Web Fetch',
  },
];

export interface McpToolDef {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

export interface McpPanelSpec {
  id: string;
  title: string;
  serverUrl: string;
  customHeaders: Record<string, string>;
  toolName: string;
  toolArgs: Record<string, unknown>;
  refreshIntervalMs: number;
  createdAt: number;
  updatedAt: number;
}

export function loadMcpPanels(): McpPanelSpec[] {
  return loadFromStorage<McpPanelSpec[]>(STORAGE_KEY, []);
}

export function saveMcpPanel(spec: McpPanelSpec): void {
  const existing = loadMcpPanels().filter(p => p.id !== spec.id);
  const updated = [...existing, spec].slice(-MAX_PANELS);
  saveToStorage(STORAGE_KEY, updated);
}

export function deleteMcpPanel(id: string): void {
  const updated = loadMcpPanels().filter(p => p.id !== id);
  saveToStorage(STORAGE_KEY, updated);
  cleanSpanEntry(PANEL_SPANS_KEY, id);
  cleanSpanEntry(PANEL_COL_SPANS_KEY, id);
}

export function getMcpPanel(id: string): McpPanelSpec | null {
  return loadMcpPanels().find(p => p.id === id) ?? null;
}

function cleanSpanEntry(storageKey: string, panelId: string): void {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    const spans = JSON.parse(raw) as Record<string, number>;
    if (!(panelId in spans)) return;
    delete spans[panelId];
    if (Object.keys(spans).length === 0) {
      localStorage.removeItem(storageKey);
    } else {
      localStorage.setItem(storageKey, JSON.stringify(spans));
    }
  } catch { /* ignore */ }
}
