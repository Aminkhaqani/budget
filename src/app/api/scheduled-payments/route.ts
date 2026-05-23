import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET all scheduled payments
export async function GET() {
  try {
    const scheduledPayments = await db.scheduledPayment.findMany({
      include: {
        account: true,
        category: true
      },
      orderBy: { nextDueDate: 'asc' }
    })
    return NextResponse.json(scheduledPayments)
  } catch (error) {
    console.error('Error fetching scheduled payments:', error)
    return NextResponse.json({ error: 'Failed to fetch scheduled payments' }, { status: 500 })
  }
}

// POST create new scheduled payment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, amount, frequency, customDays, startDate, endDate, nextDueDate, accountId, categoryId, description, autoRecord } = body
    
    const scheduledPayment = await db.scheduledPayment.create({
      data: {
        name,
        type,
        amount: parseFloat(amount),
        frequency,
        customDays: customDays ? parseInt(customDays) : null,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        nextDueDate: new Date(nextDueDate),
        accountId,
        categoryId: categoryId || null,
        description,
        autoRecord: autoRecord || false,
        isActive: true
      },
      include: {
        account: true,
        category: true
      }
    })
    
    return NextResponse.json(scheduledPayment)
  } catch (error) {
    console.error('Error creating scheduled payment:', error)
    return NextResponse.json({ error: 'Failed to create scheduled payment' }, { status: 500 })
  }
}
