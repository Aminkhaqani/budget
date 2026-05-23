import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET all categories
export async function GET() {
  try {
    const categories = await db.category.findMany({
      orderBy: [{ type: 'asc' }, { name: 'asc' }]
    })
    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 })
  }
}

// POST create new category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, icon, color, budget } = body
    
    const category = await db.category.create({
      data: {
        name,
        type,
        icon: icon || null,
        color: color || null,
        budget: budget ? parseFloat(budget) : null
      }
    })
    
    return NextResponse.json(category)
  } catch (error) {
    console.error('Error creating category:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}
