
import { WeaveProjectFile } from './schemas';

const DB_NAME = 'WonderWeavesDB';
const DB_VERSION = 1;

export interface StoredProjectSummary {
    id: string;
    name: string;
    modified: number;
    preview: string; // DataURL thumbnail
}

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onupgradeneeded = (e) => {
            const db = (e.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains('projects')) {
                db.createObjectStore('projects', { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains('yarns')) {
                db.createObjectStore('yarns', { keyPath: 'id' });
            }
        };
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const StorageService = {
    saveProject: async (project: WeaveProjectFile, thumbnail: string) => {
        const db = await openDB();
        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction('projects', 'readwrite');
            const store = tx.objectStore('projects');
            // We store the full project plus a thumbnail for the UI.
            // Using timestamp as ID for now, in future use UUID
            const record = { ...project, id: project.timestamp.toString(), thumbnail }; 
            store.put(record);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },

    getAllProjects: async (): Promise<StoredProjectSummary[]> => {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('projects', 'readonly');
            const store = tx.objectStore('projects');
            const request = store.getAll();
            request.onsuccess = () => {
                const results = request.result.map((item: any) => ({
                    id: item.id,
                    name: item.name || 'Untitled Weave',
                    modified: item.timestamp,
                    preview: item.thumbnail
                }));
                // Sort by newest first
                results.sort((a: StoredProjectSummary, b: StoredProjectSummary) => b.modified - a.modified);
                resolve(results);
            };
            request.onerror = () => reject(request.error);
        });
    },

    loadProject: async (id: string): Promise<WeaveProjectFile> => {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('projects', 'readonly');
            const store = tx.objectStore('projects');
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result as WeaveProjectFile);
            request.onerror = () => reject(request.error);
        });
    },

    deleteProject: async (id: string) => {
        const db = await openDB();
        return new Promise<void>((resolve, reject) => {
            const tx = db.transaction('projects', 'readwrite');
            const store = tx.objectStore('projects');
            store.delete(id);
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }
};
