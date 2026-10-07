export function parseCsv(text:string):string[][] {
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false;
 text=text.replace(/^\uFEFF/,'');
 for(let i=0;i<text.length;i++) {
  const c=text[i];
  if(c==='"') {if(quoted&&text[i+1]==='"'){cell+='"';i++;}else if(!quoted&&cell.length>0)throw Error('Comillas inválidas en el CSV.');else quoted=!quoted;}
  else if(c===','&&!quoted){row.push(cell);cell='';}
  else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);if(row.some(Boolean))rows.push(row);row=[];cell='';}
  else cell+=c;
 }
 if(quoted)throw Error('Hay un campo sin cerrar en el CSV.');row.push(cell);if(row.some(Boolean))rows.push(row);return rows;
}
export function csvCell(value:unknown):string {
 let v=Array.isArray(value)?value.join(' | '):String(value??'');
 if(/^[\s]*[=+\-@\t\r]/.test(v))v="'"+v;
 return '"'+v.replaceAll('"','""')+'"';
}
export function csv(columns:string[],rows:Record<string,unknown>[]):string {return '\uFEFF'+[columns.map(csvCell).join(','),...rows.map(r=>columns.map(c=>csvCell(r[c])).join(','))].join('\r\n');}
