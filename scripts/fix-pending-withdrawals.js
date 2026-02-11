/**
 * Script para corrigir saques pendentes/aprovados que não têm o saldo bloqueado
 * 
 * Este script:
 * 1. Busca todos os saques PENDING ou APPROVED
 * 2. Verifica se o vendedor tem SellerAccount
 * 3. Bloqueia o valor do saque na conta digital
 * 4. Cria transação WITHDRAWAL com status PENDING
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function fixPendingWithdrawals() {
  console.log('='.repeat(60))
  console.log('CORREÇÃO DE SAQUES PENDENTES - BLOQUEIO DE SALDO')
  console.log('='.repeat(60))
  console.log()

  try {
    // Buscar saques PENDING ou APPROVED
    const pendingWithdrawals = await prisma.withdrawal.findMany({
      where: {
        status: { in: ['PENDING', 'APPROVED', 'PROCESSING'] }
      },
      include: {
        seller: {
          include: {
            user: { select: { name: true } }
          }
        }
      }
    })

    console.log(`Encontrados ${pendingWithdrawals.length} saques pendentes/aprovados\n`)

    if (pendingWithdrawals.length === 0) {
      console.log('Nenhum saque pendente para corrigir.')
      return
    }

    let fixed = 0
    let alreadyBlocked = 0
    let errors = 0

    for (const withdrawal of pendingWithdrawals) {
      console.log(`\n--- Saque ${withdrawal.id} ---`)
      console.log(`   Vendedor: ${withdrawal.seller.storeName} (${withdrawal.seller.user?.name})`)
      console.log(`   Valor: R$ ${withdrawal.amount.toFixed(2)}`)
      console.log(`   Status: ${withdrawal.status}`)

      try {
        // Verificar/criar conta digital
        let sellerAccount = await prisma.sellerAccount.findUnique({
          where: { sellerId: withdrawal.sellerId }
        })

        if (!sellerAccount) {
          console.log('   ⚠️ Conta digital não existe, criando...')
          sellerAccount = await prisma.sellerAccount.create({
            data: {
              sellerId: withdrawal.sellerId,
              accountNumber: `SA${Date.now()}${withdrawal.sellerId.slice(-4)}`,
              status: 'ACTIVE',
              balance: withdrawal.seller.balance,
              blockedBalance: 0,
              totalReceived: withdrawal.seller.totalEarnings || 0,
              totalWithdrawn: withdrawal.seller.totalWithdrawn || 0
            }
          })
          console.log('   ✅ Conta digital criada')
        }

        // Verificar se já existe transação PENDING para este saque
        const existingTransaction = await prisma.sellerAccountTransaction.findFirst({
          where: {
            withdrawalId: withdrawal.id,
            type: 'WITHDRAWAL',
            status: 'PENDING'
          }
        })

        if (existingTransaction) {
          console.log('   ℹ️ Já existe transação PENDING para este saque')
          alreadyBlocked++
          continue
        }

        // Bloquear valor e criar transação
        await prisma.$transaction(async (tx) => {
          // 1. Incrementar blockedBalance
          await tx.sellerAccount.update({
            where: { sellerId: withdrawal.sellerId },
            data: {
              blockedBalance: { increment: withdrawal.amount }
            }
          })

          // 2. Criar transação WITHDRAWAL pendente
          await tx.sellerAccountTransaction.create({
            data: {
              accountId: sellerAccount.id,
              type: 'WITHDRAWAL',
              amount: -withdrawal.amount,
              balanceBefore: sellerAccount.balance,
              balanceAfter: sellerAccount.balance - withdrawal.amount,
              description: `Saque via ${withdrawal.paymentMethod} (correção)`,
              reference: withdrawal.id,
              referenceType: 'WITHDRAWAL',
              withdrawalId: withdrawal.id,
              status: 'PENDING'
            }
          })
        })

        console.log('   ✅ Valor bloqueado e transação criada')
        fixed++

      } catch (error) {
        console.log(`   ❌ Erro: ${error.message}`)
        errors++
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('RESUMO')
    console.log('='.repeat(60))
    console.log(`Total de saques pendentes: ${pendingWithdrawals.length}`)
    console.log(`Corrigidos: ${fixed}`)
    console.log(`Já bloqueados: ${alreadyBlocked}`)
    console.log(`Erros: ${errors}`)
    console.log('='.repeat(60))

  } catch (error) {
    console.error('Erro fatal:', error)
  } finally {
    await prisma.$disconnect()
  }
}

// Executar
fixPendingWithdrawals()
  .then(() => console.log('\nScript finalizado.'))
  .catch(console.error)
