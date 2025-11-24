export class PagueloFacilService {
  static async createTransaction(amount: number, description: string, email: string) {
    // Simulate API call to PagueloFacil
    console.log(`[PagueloFacil] Creating transaction for ${email} amount ${amount}`);
    
    return {
      success: true,
      paymentUrl: `https://tx.paguelofacil.com/pay/${Math.random().toString(36).substring(7)}`, // Mock URL
      txId: `pf_${Math.random().toString(36).substring(7)}`
    };
  }
}
