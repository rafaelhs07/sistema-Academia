import Decimal from 'decimal.js';
Decimal.set({ precision: 32, rounding: Decimal.ROUND_HALF_UP });
export function money(value:string|number):string {
 const d=new Decimal(value);
 if(!d.isFinite() || d.abs().gt('999999999999.99') || d.decimalPlaces()>2) throw Error('Usa un importe válido con hasta dos decimales.');
 return d.toFixed(2);
}
export function sum(values:(string|number)[]):string {return values.reduce<Decimal>((total,v)=>total.plus(money(v)),new Decimal(0)).toFixed(2);}
export function formatMoney(value:unknown,currency:string,locale='es') {return new Intl.NumberFormat(locale,{style:'currency',currency,currencyDisplay:'code'}).format(Number(value??0));}
export function allowed(permissions:string[],permission:string) {return permissions.includes('*')||permissions.includes(permission);}
