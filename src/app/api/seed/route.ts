import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET - Seed default categories
export async function GET() {
  try {
    // Check if categories already exist
    const existing = await db.category.count()
    
    if (existing > 0) {
      return NextResponse.json({ message: 'Categories already seeded' })
    }
    
    // Seed expense categories
    const expenseCategories = [
      { name: 'Food & Dining', type: 'expense', color: '#ef4444', icon: 'utensils' },
      { name: 'Transportation', type: 'expense', color: '#f59e0b', icon: 'car' },
      { name: 'Shopping', type: 'expense', color: '#ec4899', icon: 'shopping-bag' },
      { name: 'Entertainment', type: 'expense', color: '#8b5cf6', icon: 'film' },
      { name: 'Bills & Utilities', type: 'expense', color: '#3b82f6', icon: 'file-text' },
      { name: 'Healthcare', type: 'expense', color: '#10b981', icon: 'heart' },
      { name: 'Education', type: 'expense', color: '#06b6d4', icon: 'book' },
      { name: 'Travel', type: 'expense', color: '#f97316', icon: 'plane' },
      { name: 'Personal Care', type: 'expense', color: '#a855f7', icon: 'scissors' },
      { name: 'Other Expense', type: 'expense', color: '#6b7280', icon: 'more-horizontal' }
    ]
    
    // Seed income categories
    const incomeCategories = [
      { name: 'Salary', type: 'income', color: '#10b981', icon: 'briefcase' },
      { name: 'Freelance', type: 'income', color: '#3b82f6', icon: 'laptop' },
      { name: 'Investment', type: 'income', color: '#8b5cf6', icon: 'trending-up' },
      { name: 'Rental Income', type: 'income', color: '#f59e0b', icon: 'home' },
      { name: 'Gift', type: 'income', color: '#ec4899', icon: 'gift' },
      { name: 'Other Income', type: 'income', color: '#6b7280', icon: 'more-horizontal' }
    ]
    
    await db.category.createMany({
      data: [...expenseCategories, ...incomeCategories]
    })
    
    return NextResponse.json({ message: 'Categories seeded successfully', count: expenseCategories.length + incomeCategories.length })
  } catch (error) {
    console.error('Error seeding categories:', error)
    return NextResponse.json({ error: 'Failed to seed categories' }, { status: 500 })
  }
}
