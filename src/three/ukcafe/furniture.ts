import type { ReactNode } from 'react'
import type { Vector3 } from '@react-three/fiber'

export interface CafeTableConfig {
  width?: number
  depth?: number
  height?: number
  legThickness?: number
}

export function getDefaultTableConfig(): CafeTableConfig {
  return {
    width: 1.8,
    depth: 1.2,
    height: 1.2,
    legThickness: 0.06,
  }
}

export interface CafeChairConfig {
  seatSize?: number
  seatHeight?: number
  backHeight?: number
  legThickness?: number
}

export function getDefaultChairConfig(): CafeChairConfig {
  return {
    seatSize: 0.5,
    seatHeight: 0.55,
    backHeight: 0.8,
    legThickness: 0.04,
  }
}

export const CAFE_COLORS = {
  darkWood: '#3D2010',
  mediumWood: '#4A2F1A',
  lightWood: '#6B4226',
  upholstery: '#8B2500',
  brass: '#DAA520',
  cream: '#FFFFF0',
  marble: '#F5F0E8',
  brick: '#8B4513',
  tileLight: '#F5E6D3',
  tileDark: '#3D2B1F',
  gold: '#FFD700',
  plantGreen: '#2E8B57',
  fire: '#FF6347',
} as const