import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET all contacts
export async function GET() {
  try {
    const contacts = await db.contact.findMany({
      orderBy: { name: 'asc' }
    })
    return NextResponse.json(contacts)
  } catch (error) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 })
  }
}

// POST create new contact
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, email, phone, type, notes } = body
    
    const contact = await db.contact.create({
      data: {
        name,
        email: email || null,
        phone: phone || null,
        type: type || 'person',
        notes: notes || null
      }
    })
    
    return NextResponse.json(contact)
  } catch (error) {
    console.error('Error creating contact:', error)
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 })
  }
}
