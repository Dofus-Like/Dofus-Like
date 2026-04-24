export const getResourceIconPath = (resourceName: string | null): string => {
  if (!resourceName) return '/assets/items/bois.png';
  
  const mapping: Record<string, string> = {
    'BOIS': 'bois.png',
    'FER': 'fer.png',
    'CUIR': 'cuir.png',
    'CRISTAL MAGIQUE': 'cristal.png',
    'ÉTOFFE': 'etoffe.png',
    'HERBE MÉDICINALE': 'herbe.png',
    'OR': 'or.png'
  };
  
  const key = resourceName.toUpperCase();
  const filename = mapping[key] || 'bois.png';
  return `/assets/items/${filename}`;
};
