import { OptionsChatBubble } from '../interfaces/options-chat-bubble';

export const ACTIONS_GRID_MAIN: OptionsChatBubble[] = [
  { label: 'Editar',   action: 'edit',   icon: 'matModeEditOutline',    colorIcon: 'text-blue-500' },
  { label: 'Eliminar', action: 'delete', icon: 'matDeleteOutline',       colorIcon: 'text-red-500' },
];
export const ACTIONS_GRID_MAIN_VIEW: OptionsChatBubble[] = [
  { label: 'Ver',      action: 'view',   icon: 'matRemoveRedEyeOutline', colorIcon: 'text-blue-500' },
  { label: 'Editar',   action: 'edit',   icon: 'matModeEditOutline',     colorIcon: 'text-yellow-500' },
];
export const ACTIONS_COMPRAS: OptionsChatBubble[] = [
  { label: 'Ver',      action: 'view',    icon: 'matRemoveRedEyeOutline',  colorIcon: 'text-blue-500' },
  { label: 'Aprobar',  action: 'aprobar', icon: 'matThumbUpOutline',        colorIcon: 'text-green-500' },
  { label: 'Recibir',  action: 'recibir', icon: 'bootstrapCheckCircleFill', colorIcon: 'text-emerald-500' },
  { label: 'Cancelar', action: 'cancelar',icon: 'bootstrapXCircle',         colorIcon: 'text-red-500' },
];
