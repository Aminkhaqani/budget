import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET all accounts
export async function GET() {
  try {
    const accounts = await db.account.findMany({
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json(accounts)
  } catch (error) {
    console.error('Error fetching accounts:', error)
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
  }
}

// POST create new account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, type, balance, currency, color, icon, isDefault } = body
    
    // If this is set as default, remove default from other accounts
    if (isDefault) {
      await db.account.updateMany({
        where: { isDefault: true },
        data: { isDefault: false }
      })
    }
    
    const account = await db.account.create({
      data: {
        name,
        type,
        balance: parseFloat(balance) || 0,
        currency: currency || 'USD',
        color: color || null,
        icon: icon || null,
        isDefault: isDefault || false,
        isActive: true
      }
    })
    
    return NextResponse.json(account)
  } catch (error) {
    console.error('Error creating account:', error)
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
  }
}
