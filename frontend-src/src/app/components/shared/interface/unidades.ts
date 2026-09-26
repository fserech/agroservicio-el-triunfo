export interface Unidades {
  codigo: string;
  nombre: string;
  nombrePlural: string;
}

export const unidadesMedida: Unidades[] = [
  { codigo: 'unidad', nombre: 'Unidad',     nombrePlural: 'Unidades' },
  { codigo: 'qq',     nombre: 'Quintal',    nombrePlural: 'Quintales' },   // 100 lb ≈ 45.36 kg
  { codigo: 'lb',     nombre: 'Libra',      nombrePlural: 'Libras' },
  { codigo: 'kg',     nombre: 'Kilogramo',  nombrePlural: 'Kilogramos' },
  { codigo: 'lt',     nombre: 'Litro',      nombrePlural: 'Litros' },
  { codigo: 'm',      nombre: 'Metro',      nombrePlural: 'Metros' },
  { codigo: 'saco',   nombre: 'Saco',       nombrePlural: 'Sacos' },
  { codigo: 'caja',   nombre: 'Caja',       nombrePlural: 'Cajas' },
  { codigo: 'rollo',  nombre: 'Rollo',      nombrePlural: 'Rollos' },
  { codigo: 'sobre',  nombre: 'Sobre',      nombrePlural: 'Sobres' },
  { codigo: 'par',    nombre: 'Par',        nombrePlural: 'Pares' }
];