const documents = new Map();


export const getDocument = (docId) => documents.get(docId);

export const createDocument = (docId, content = "") => {
  documents.set(docId, {
    content,
    clients: new Set()
  });
};

export const deleteDocument = (docId) => {
  documents.delete(docId);
};
