import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

// Interface pour les modules
interface Module {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  icon?: string;
  settings?: Record<string, any>;
  requiredPermissions?: string[];
  version: string;
}

// GET /api/modules - Récupérer tous les modules
export async function GET(request: NextRequest) {
  try {
    const modules = await prisma.module.findMany({
      orderBy: {
        name: 'asc',
      },
    });

    // Transformer les modules de la base de données au format attendu
    const formattedModules: Module[] = modules.map(module => ({
      id: module.id,
      name: module.name,
      description: module.description,
      enabled: module.enabled,
      icon: module.icon || undefined,
      settings: module.settings ? JSON.parse(module.settings as string) : {},
      requiredPermissions: module.requiredPermissions ? JSON.parse(module.requiredPermissions as string) : [],
      version: module.version,
    }));

    return NextResponse.json(formattedModules);
  } catch (error) {
    console.error('Erreur lors de la récupération des modules:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des modules' },
      { status: 500 }
    );
  }
}

// POST /api/modules - Créer un nouveau module
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Valider les champs obligatoires
    if (!body.name || !body.description) {
      return NextResponse.json(
        { error: 'Nom et description obligatoires' },
        { status: 400 }
      );
    }

    // Créer le module avec des valeurs par défaut pour les champs manquants
    const module = await prisma.module.create({
      data: {
        id: uuidv4(),
        name: body.name,
        description: body.description,
        enabled: body.enabled ?? false,
        icon: body.icon || null,
        settings: body.settings ? JSON.stringify(body.settings) : null,
        requiredPermissions: body.requiredPermissions ? JSON.stringify(body.requiredPermissions) : null,
        version: '1.0.0', // Version par défaut
      },
    });

    // Formater la réponse
    const formattedModule: Module = {
      id: module.id,
      name: module.name,
      description: module.description,
      enabled: module.enabled,
      icon: module.icon || undefined,
      settings: module.settings ? JSON.parse(module.settings as string) : {},
      requiredPermissions: module.requiredPermissions 
        ? JSON.parse(module.requiredPermissions as string) 
        : [],
      version: module.version,
    };

    return NextResponse.json(formattedModule, { status: 201 });
  } catch (error) {
    console.error('Erreur lors de la création du module:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du module' },
      { status: 500 }
    );
  }
}

// PATCH /api/modules/[moduleId] - Mettre à jour un module existant
export async function PATCH(
  request: NextRequest,
  { params }: { params: { moduleId: string } }
) {
  try {
    const moduleId = params.moduleId;
    const body = await request.json();

    // Vérifier si le module existe
    const existingModule = await prisma.module.findUnique({
      where: { id: moduleId },
    });

    if (!existingModule) {
      return NextResponse.json(
        { error: 'Module non trouvé' },
        { status: 404 }
      );
    }

    // Mettre à jour le module
    const updatedModule = await prisma.module.update({
      where: { id: moduleId },
      data: {
        name: body.name !== undefined ? body.name : undefined,
        description: body.description !== undefined ? body.description : undefined,
        enabled: body.enabled !== undefined ? body.enabled : undefined,
        icon: body.icon !== undefined ? body.icon : undefined,
        settings: body.settings !== undefined ? JSON.stringify(body.settings) : undefined,
        requiredPermissions: body.requiredPermissions !== undefined 
          ? JSON.stringify(body.requiredPermissions) 
          : undefined,
        version: body.version !== undefined ? body.version : undefined,
      },
    });

    // Formater la réponse
    const formattedModule: Module = {
      id: updatedModule.id,
      name: updatedModule.name,
      description: updatedModule.description,
      enabled: updatedModule.enabled,
      icon: updatedModule.icon || undefined,
      settings: updatedModule.settings ? JSON.parse(updatedModule.settings as string) : {},
      requiredPermissions: updatedModule.requiredPermissions 
        ? JSON.parse(updatedModule.requiredPermissions as string) 
        : [],
      version: updatedModule.version,
    };

    return NextResponse.json(formattedModule);
  } catch (error) {
    console.error('Erreur lors de la mise à jour du module:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du module' },
      { status: 500 }
    );
  }
}

// DELETE /api/modules/[moduleId] - Supprimer un module
export async function DELETE(
  request: NextRequest,
  { params }: { params: { moduleId: string } }
) {
  try {
    const moduleId = params.moduleId;

    // Vérifier si le module existe
    const existingModule = await prisma.module.findUnique({
      where: { id: moduleId },
    });

    if (!existingModule) {
      return NextResponse.json(
        { error: 'Module non trouvé' },
        { status: 404 }
      );
    }

    // Supprimer le module
    await prisma.module.delete({
      where: { id: moduleId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la suppression du module:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du module' },
      { status: 500 }
    );
  }
} 