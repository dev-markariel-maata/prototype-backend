export const formatDate = (dateParams: Date): string => {
    const year = dateParams.getFullYear();
    const month = String(dateParams.getMonth() + 1).padStart(2, '0');
    const day = String(dateParams.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
};
