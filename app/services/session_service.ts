import dns from 'dns/promises';

function isValidEmailSyntax(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

async function isDomainValid(email: string): Promise<boolean> {
    const domain = email.split('@')[1];
    try {
        const records = await dns.resolveMx(domain);
        return records && records.length > 0;
    } catch (error) {
        return false;
    }
}

export async function isEmailValid(email: string): Promise<boolean> {
    if (!isValidEmailSyntax(email)) return false;
    if (!await isDomainValid(email)) return false;
    return true;
}
