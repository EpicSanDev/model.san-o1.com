import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Obtenir tous les paramètres
export async function GET() {
  try {
    // Dans une application réelle, nous récupérerions l'ID d'utilisateur depuis la session
    const userId = 'default-user';
    
    const settings = await prisma.setting.findMany({
      where: {
        userId,
      },
    });
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Erreur lors de la récupération des paramètres:', error);
    
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des paramètres.' },
      { status: 500 }
    );
  }
}

// Mettre à jour les paramètres
export async function PUT(request: NextRequest) {
  try {
    const settings = await request.json();
    
    if (!Array.isArray(settings)) {
      return NextResponse.json(
        { error: 'Les paramètres doivent être un tableau.' },
        { status: 400 }
      );
    }
    
    // Dans une application réelle, nous récupérerions l'ID d'utilisateur depuis la session
    const userId = 'default-user';
    
    // Mettre à jour chaque paramètre
    const results = await Promise.all(
      settings.map(async (setting) => {
        const { id, key, value } = setting;
        
        if (!key || value === undefined) {
          return { error: 'Clé et valeur requises pour chaque paramètre.' };
        }
        
        if (id) {
          // Mettre à jour un paramètre existant
          return prisma.setting.update({
            where: { id },
            data: { value },
          });
        } else {
          // Créer un nouveau paramètre ou mettre à jour s'il existe
          const existingSetting = await prisma.setting.findFirst({
            where: {
              userId,
              key,
            },
          });
          
          if (existingSetting) {
            return prisma.setting.update({
              where: { id: existingSetting.id },
              data: { value },
            });
          } else {
            return prisma.setting.create({
              data: {
                key,
                value,
                userId,
              },
            });
          }
        }
      })
    );
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Erreur lors de la mise à jour des paramètres:', error);
    
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour des paramètres.' },
      { status: 500 }
    );
  }
} 