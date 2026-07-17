/**
 * Bibliothèque d'exercices : technique, muscles ciblés, positions.
 * Données statiques pures (aucune I/O) — la correspondance avec l'équipement
 * d'une salle se fait par nom normalisé (accents/casse/parenthèses ignorés).
 */

import type { MetricSetKey } from './metrics';
import type { EquipmentCategory, MuscleGroup } from './types';

export interface ExerciseInfo {
  /** Identifiant stable (kebab-case) — sert aussi de route `/exercise/[slug]`. */
  slug: string;
  name: string;
  /** Noms alternatifs (dont noms d'équipement du seed) pour la correspondance. */
  aliases: string[];
  category: EquipmentCategory;
  /** Muscles principalement sollicités (surlignés pleins sur la carte anatomique). */
  primary: MuscleGroup[];
  /** Muscles secondaires (surlignés atténués). */
  secondary: MuscleGroup[];
  metricSet: MetricSetKey;
  /** Position de départ puis déroulé du mouvement, dans l'ordre. */
  steps: string[];
  /** Consignes de technique/sécurité. */
  tips: string[];
  /** Erreurs courantes à éviter. */
  mistakes: string[];
  /** Pose 3D associée si disponible (voir pose3d/poses.ts). */
  poseId?: string;
}

/** Minuscules, sans accents, sans contenu entre parenthèses, espaces normalisés. */
export function normalizeExerciseName(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // diacritiques combinants (accents)
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Retrouve la fiche d'un exercice à partir d'un nom libre (nom d'équipement,
 * nom saisi, nom généré). Priorité : slug exact → alias exact → inclusion.
 */
export function findExerciseInfo(name: string): ExerciseInfo | undefined {
  const n = normalizeExerciseName(name);
  if (!n) return undefined;
  const bySlug = EXERCISE_LIBRARY.find((e) => e.slug === name || normalizeExerciseName(e.name) === n);
  if (bySlug) return bySlug;
  const byAlias = EXERCISE_LIBRARY.find((e) => e.aliases.some((a) => normalizeExerciseName(a) === n));
  if (byAlias) return byAlias;
  // Inclusion (le plus long alias correspondant gagne, pour éviter les faux amis courts).
  let best: { info: ExerciseInfo; len: number } | undefined;
  for (const e of EXERCISE_LIBRARY) {
    for (const a of [e.name, ...e.aliases]) {
      const na = normalizeExerciseName(a);
      if (na.length < 4) continue;
      if ((n.includes(na) || na.includes(n)) && (!best || na.length > best.len)) {
        best = { info: e, len: na.length };
      }
    }
  }
  return best?.info;
}

export const EXERCISE_LIBRARY: ExerciseInfo[] = [
  // ————— Jambes / fessiers —————
  {
    slug: 'presse-a-cuisses',
    name: 'Presse à cuisses',
    aliases: ['leg press', 'presse'],
    category: 'machine',
    primary: ['legs', 'glutes'],
    secondary: ['calves'],
    metricSet: 'strength',
    steps: [
      'Assis dossier plaqué, pieds à plat sur la plateforme, largeur d’épaules.',
      'Déverrouiller les sécurités, descendre le chariot en fléchissant les genoux vers ~90°.',
      'Pousser dans les talons pour revenir, sans verrouiller complètement les genoux.',
    ],
    tips: ['Garder le bas du dos plaqué au dossier pendant toute la descente.', 'Genoux dans l’axe des pieds, jamais vers l’intérieur.'],
    mistakes: ['Décoller les lombaires en descendant trop bas.', 'Verrouiller brutalement les genoux en haut.'],
    poseId: 'leg-press',
  },
  {
    slug: 'squat',
    name: 'Squat barre',
    aliases: ['rack / cage a squat', 'back squat', 'squat barre nuque'],
    category: 'free_weight',
    primary: ['legs', 'glutes'],
    secondary: ['back', 'abs'],
    metricSet: 'strength',
    steps: [
      'Barre posée sur les trapèzes, pieds largeur d’épaules, pointes légèrement ouvertes.',
      'Inspirer, gainer, descendre hanches en arrière et genoux fléchis jusqu’à cuisses ~parallèles.',
      'Remonter en poussant le sol, expirer en fin de montée.',
    ],
    tips: ['Regard devant soi, dos neutre du début à la fin.', 'Utiliser les sécurités du rack réglées juste sous la profondeur de travail.'],
    mistakes: ['Talons qui décollent (mobilité cheville insuffisante ou barre trop avancée).', 'Dos qui s’arrondit en bas de mouvement.'],
    poseId: 'squat',
  },
  {
    slug: 'hack-squat',
    name: 'Hack squat',
    aliases: ['hack squat machine'],
    category: 'machine',
    primary: ['legs'],
    secondary: ['glutes'],
    metricSet: 'strength',
    steps: [
      'Épaules sous les boudins, dos plaqué, pieds mi-hauts sur la plateforme.',
      'Déverrouiller, descendre contrôlé jusqu’à cuisses parallèles.',
      'Remonter en poussant dans l’ensemble du pied sans verrouiller les genoux.',
    ],
    tips: ['Placer les pieds plus haut sur la plateforme sollicite davantage fessiers/ischios.'],
    mistakes: ['Décoller les talons en position basse.', 'Amplitude écourtée avec charge trop lourde.'],
    poseId: 'squat',
  },
  {
    slug: 'leg-extension',
    name: 'Leg extension',
    aliases: ['extension jambes'],
    category: 'machine',
    primary: ['legs'],
    secondary: [],
    metricSet: 'strength',
    steps: [
      'Assis, genou aligné avec l’axe de la machine, boudin sur le bas des tibias.',
      'Tendre les jambes jusqu’à l’horizontale en contrôlant.',
      'Redescendre lentement sans laisser tomber la charge.',
    ],
    tips: ['Régler le dossier pour que le genou soit exactement dans l’axe de rotation.'],
    mistakes: ['Donner un à-coup avec le bassin pour monter la charge.'],
    poseId: 'leg-extension',
  },
  {
    slug: 'leg-curl',
    name: 'Leg curl',
    aliases: ['ischio curl', 'flexion jambes'],
    category: 'machine',
    primary: ['legs'],
    secondary: ['glutes'],
    metricSet: 'strength',
    steps: [
      'Installé (allongé ou assis selon la machine), boudin au-dessus des talons.',
      'Fléchir les genoux en amenant les talons vers les fessiers.',
      'Revenir lentement à la position tendue sans relâcher d’un coup.',
    ],
    tips: ['Garder les hanches plaquées : le mouvement vient des genoux, pas du bassin.'],
    mistakes: ['Cambrer pour tricher sur la fin de flexion.'],
    poseId: 'leg-curl',
  },
  {
    slug: 'fentes',
    name: 'Fentes haltères',
    aliases: ['lunges', 'fentes marchees', 'fente avant'],
    category: 'free_weight',
    primary: ['legs', 'glutes'],
    secondary: ['abs'],
    metricSet: 'strength',
    steps: [
      'Debout, un haltère dans chaque main, buste droit.',
      'Grand pas en avant, descendre le genou arrière vers le sol (sans le toucher).',
      'Pousser sur la jambe avant pour revenir, alterner les jambes.',
    ],
    tips: ['Le genou avant reste au-dessus du pied, pas au-delà des orteils.'],
    mistakes: ['Pas trop court qui envoie le genou loin devant.', 'Buste qui bascule en avant.'],
    poseId: 'lunge',
  },
  {
    slug: 'hip-thrust',
    name: 'Hip thrust',
    aliases: ['extension de hanches barre', 'releve de bassin'],
    category: 'free_weight',
    primary: ['glutes'],
    secondary: ['legs'],
    metricSet: 'strength',
    steps: [
      'Haut du dos en appui sur un banc, barre (matelassée) sur le pli des hanches, pieds à plat.',
      'Pousser les hanches vers le plafond jusqu’à l’alignement épaules-hanches-genoux.',
      'Marquer une seconde en haut, redescendre contrôlé.',
    ],
    tips: ['Menton rentré, regard vers l’avant pour garder le dos neutre.'],
    mistakes: ['Hyper-extension lombaire en haut au lieu d’une contraction des fessiers.'],
    poseId: 'hip-thrust',
  },
  {
    slug: 'adducteurs',
    name: 'Adducteurs machine',
    aliases: ['adducteurs'],
    category: 'machine',
    primary: ['legs'],
    secondary: [],
    metricSet: 'strength',
    steps: ['Assis, jambes écartées contre les boudins.', 'Serrer les jambes en contrôlant.', 'Rouvrir lentement sans laisser la charge claquer.'],
    tips: ['Régler l’ouverture de départ à une amplitude confortable, l’augmenter progressivement.'],
    mistakes: ['Ouverture de départ excessive dès la première série.'],
  },
  {
    slug: 'abducteurs',
    name: 'Abducteurs machine',
    aliases: ['abducteurs'],
    category: 'machine',
    primary: ['glutes'],
    secondary: ['legs'],
    metricSet: 'strength',
    steps: ['Assis, jambes serrées, boudins contre l’extérieur des genoux.', 'Écarter les jambes au maximum contrôlable.', 'Revenir lentement.'],
    tips: ['Buste légèrement penché en avant pour accentuer le moyen fessier.'],
    mistakes: ['Utiliser l’élan du buste pour écarter plus loin.'],
  },
  {
    slug: 'mollets-debout',
    name: 'Mollets (calf raises)',
    aliases: ['mollets', 'calf', 'calf raises', 'extensions mollets'],
    category: 'machine',
    primary: ['calves'],
    secondary: [],
    metricSet: 'strength',
    steps: [
      'Avant-pieds sur le rebord, talons dans le vide.',
      'Monter sur les pointes le plus haut possible.',
      'Redescendre lentement jusqu’à l’étirement complet du mollet.',
    ],
    tips: ['Marquer un temps d’arrêt en haut et en bas : pas de rebond.'],
    mistakes: ['Rebondir en bas d’amplitude avec l’élan.'],
  },
  {
    slug: 'souleve-de-terre',
    name: 'Soulevé de terre',
    aliases: ['deadlift', 'barres olympiques disques', 'souleve de terre conventionnel'],
    category: 'free_weight',
    primary: ['back', 'glutes', 'legs'],
    secondary: ['abs'],
    metricSet: 'strength',
    steps: [
      'Barre au sol contre les tibias, pieds largeur de hanches, prise juste à l’extérieur des jambes.',
      'Dos neutre, poitrine sortie : pousser le sol avec les jambes puis tendre les hanches.',
      'Verrouiller debout sans tirer les épaules en arrière, puis reposer contrôlé.',
    ],
    tips: ['La barre reste au contact des jambes sur tout le trajet.', 'Gainage maximal avant de décoller la barre.'],
    mistakes: ['Dos arrondi au décollage.', 'Hanches qui montent avant les épaules (le dos fait tout le travail).'],
    poseId: 'deadlift',
  },
  // ————— Pectoraux —————
  {
    slug: 'developpe-couche',
    name: 'Développé couché',
    aliases: ['bench press', 'bancs', 'developpe couche halteres'],
    category: 'free_weight',
    primary: ['chest'],
    secondary: ['shoulders', 'triceps'],
    metricSet: 'strength',
    steps: [
      'Allongé sur le banc, pieds au sol, omoplates serrées, prise un peu plus large que les épaules.',
      'Descendre la barre contrôlée jusqu’au bas des pectoraux.',
      'Pousser en expirant, sans décoller les fessiers du banc.',
    ],
    tips: ['Poignets alignés au-dessus des coudes.', 'Sur banc, toujours travailler avec une parade ou des sécurités.'],
    mistakes: ['Rebondir la barre sur la poitrine.', 'Coudes évasés à 90° qui surchargent l’épaule.'],
    poseId: 'bench-press',
  },
  {
    slug: 'chest-press',
    name: 'Chest press',
    aliases: ['developpe assis machine', 'presse pectorale'],
    category: 'machine',
    primary: ['chest'],
    secondary: ['shoulders', 'triceps'],
    metricSet: 'strength',
    steps: [
      'Assis, poignées à hauteur du milieu des pectoraux.',
      'Pousser vers l’avant sans verrouiller les coudes.',
      'Revenir lentement, coudes qui restent légèrement devant le plan du buste.',
    ],
    tips: ['Régler la hauteur du siège : les poignées face au milieu de la poitrine.'],
    mistakes: ['Étirement excessif en arrière avec charge lourde.'],
    poseId: 'bench-press',
  },
  {
    slug: 'pec-deck',
    name: 'Pec deck (butterfly)',
    aliases: ['pec deck', 'butterfly', 'ecarte machine'],
    category: 'machine',
    primary: ['chest'],
    secondary: ['shoulders'],
    metricSet: 'strength',
    steps: [
      'Assis, avant-bras ou mains sur les pads, coudes légèrement fléchis.',
      'Rapprocher les bras devant la poitrine en serrant les pectoraux.',
      'Rouvrir lentement jusqu’à l’étirement confortable.',
    ],
    tips: ['Garder les épaules basses, loin des oreilles.'],
    mistakes: ['Ouvrir au-delà du plan des épaules sous charge.'],
  },
  {
    slug: 'pompes',
    name: 'Pompes',
    aliases: ['push up', 'push-ups', 'pushup'],
    category: 'functional',
    primary: ['chest'],
    secondary: ['shoulders', 'triceps', 'abs'],
    metricSet: 'bodyweight',
    steps: [
      'Planche haute, mains un peu plus larges que les épaules, corps gainé aligné.',
      'Descendre la poitrine près du sol, coudes ~45° du buste.',
      'Repousser jusqu’à l’extension complète des bras.',
    ],
    tips: ['Le corps monte et descend d’un bloc : pas de hanches qui pendent.'],
    mistakes: ['Amplitude réduite (tête qui pique au lieu de la poitrine qui descend).'],
    poseId: 'push-up',
  },
  // ————— Dos —————
  {
    slug: 'tirage-vertical',
    name: 'Tirage vertical (lat pulldown)',
    aliases: ['lat pulldown', 'tirage poitrine', 'tirage vertical'],
    category: 'machine',
    primary: ['back'],
    secondary: ['biceps', 'shoulders'],
    metricSet: 'strength',
    steps: [
      'Assis cuisses bloquées, prise large en pronation.',
      'Tirer la barre vers le haut de la poitrine en sortant les pectoraux.',
      'Contrôler la remontée jusqu’à l’étirement complet des dorsaux.',
    ],
    tips: ['Amorcer par les omoplates (les abaisser) avant de plier les coudes.'],
    mistakes: ['Se pencher loin en arrière et tirer avec l’élan.', 'Tirer la barre derrière la nuque.'],
    poseId: 'lat-pulldown',
  },
  {
    slug: 'tirage-horizontal',
    name: 'Tirage horizontal (rowing)',
    aliases: ['rowing machine assis', 'seated row', 'tirage horizontal'],
    category: 'machine',
    primary: ['back'],
    secondary: ['biceps'],
    metricSet: 'strength',
    steps: [
      'Assis, buste vertical, bras tendus vers la poignée.',
      'Tirer la poignée vers le nombril en serrant les omoplates.',
      'Revenir bras tendus sans enrouler le dos.',
    ],
    tips: ['Le buste reste quasi immobile : ~10° d’oscillation maximum.'],
    mistakes: ['Balancier du buste pour tirer plus lourd.'],
    poseId: 'seated-row',
  },
  {
    slug: 'tractions',
    name: 'Tractions',
    aliases: ['pull up', 'pull-ups', 'chin up'],
    category: 'functional',
    primary: ['back'],
    secondary: ['biceps', 'abs'],
    metricSet: 'bodyweight',
    steps: [
      'Suspendu à la barre, prise pronation un peu plus large que les épaules.',
      'Tirer jusqu’à passer le menton au-dessus de la barre.',
      'Redescendre contrôlé jusqu’aux bras tendus.',
    ],
    tips: ['Gainer les abdos pour éviter le balancement.'],
    mistakes: ['Demi-répétitions sans extension complète en bas.'],
    poseId: 'pull-up',
  },
  {
    slug: 'pull-over',
    name: 'Pull-over',
    aliases: ['pullover machine', 'pull over'],
    category: 'machine',
    primary: ['back'],
    secondary: ['chest', 'triceps'],
    metricSet: 'strength',
    steps: [
      'Installé selon la machine (ou allongé avec haltère), bras au-dessus de la tête.',
      'Ramener les bras vers l’avant/le bas en arc de cercle.',
      'Revenir lentement à l’étirement.',
    ],
    tips: ['Coudes légèrement fléchis et fixes pendant tout l’arc.'],
    mistakes: ['Casser l’angle du coude et transformer le mouvement en extension triceps.'],
  },
  {
    slug: 'lombaires',
    name: 'Extension lombaire',
    aliases: ['back extension', 'lombaires', 'banc a lombaires'],
    category: 'machine',
    primary: ['back'],
    secondary: ['glutes'],
    metricSet: 'bodyweight',
    steps: [
      'Bassin calé sur le support, chevilles bloquées, bras croisés sur la poitrine.',
      'Descendre le buste contrôlé, puis remonter jusqu’à l’alignement jambes-buste.',
      'Éviter l’hyper-extension au-delà de l’alignement.',
    ],
    tips: ['Mouvement lent et contrôlé : la vitesse n’apporte rien ici.'],
    mistakes: ['Monter au-dessus de l’horizontale en cambrant.'],
  },
  {
    slug: 'trx-rowing',
    name: 'Rowing TRX',
    aliases: ['trx', 'sangles', 'trx sangles', 'tirage trx'],
    category: 'functional',
    primary: ['back'],
    secondary: ['biceps', 'abs'],
    metricSet: 'bodyweight',
    steps: [
      'Poignées en mains, corps incliné en arrière, bras tendus, corps gainé.',
      'Tirer la poitrine vers les poignées en serrant les omoplates.',
      'Revenir contrôlé, corps toujours aligné.',
    ],
    tips: ['Plus les pieds avancent, plus c’est difficile : régler l’angle avant la série.'],
    mistakes: ['Casser les hanches au lieu de garder la planche.'],
  },
  // ————— Épaules —————
  {
    slug: 'developpe-epaules',
    name: 'Développé épaules',
    aliases: ['shoulder press', 'developpe militaire', 'overhead press'],
    category: 'machine',
    primary: ['shoulders'],
    secondary: ['triceps'],
    metricSet: 'strength',
    steps: [
      'Assis dos droit, poignées (ou haltères) à hauteur des oreilles.',
      'Pousser vers le haut jusqu’aux bras presque tendus.',
      'Redescendre contrôlé au niveau des oreilles.',
    ],
    tips: ['Abdos gainés : ne pas cambrer pour finir la répétition.'],
    mistakes: ['Descente trop basse qui force l’épaule en butée.'],
    poseId: 'shoulder-press',
  },
  {
    slug: 'elevations-laterales',
    name: 'Élévations latérales',
    aliases: ['lateral raises', 'halteres', 'elevations laterales halteres'],
    category: 'free_weight',
    primary: ['shoulders'],
    secondary: [],
    metricSet: 'strength',
    steps: [
      'Debout, un haltère dans chaque main le long du corps, coudes très légèrement fléchis.',
      'Monter les bras sur les côtés jusqu’à l’horizontale.',
      'Redescendre lentement sans balancer.',
    ],
    tips: ['Charge légère et exécution stricte : c’est un petit muscle.'],
    mistakes: ['Prendre trop lourd et compenser avec les trapèzes ou l’élan.'],
    poseId: 'lateral-raise',
  },
  // ————— Bras —————
  {
    slug: 'biceps-curl',
    name: 'Curl biceps',
    aliases: ['biceps curl machine', 'curl halteres', 'curl barre'],
    category: 'machine',
    primary: ['biceps'],
    secondary: [],
    metricSet: 'strength',
    steps: [
      'Coudes calés (machine/pupitre) ou le long du corps (haltères).',
      'Fléchir les coudes en montant la charge vers les épaules.',
      'Redescendre lentement jusqu’à l’extension quasi complète.',
    ],
    tips: ['Les coudes restent fixes : seule la flexion du coude travaille.'],
    mistakes: ['Balancer le buste pour amorcer la montée.'],
    poseId: 'biceps-curl',
  },
  {
    slug: 'triceps-pushdown',
    name: 'Extension triceps poulie',
    aliases: ['triceps', 'pushdown', 'triceps dips pushdown', 'poulies functional trainer', 'extension poulie haute'],
    category: 'machine',
    primary: ['triceps'],
    secondary: [],
    metricSet: 'strength',
    steps: [
      'Face à la poulie haute, coudes collés au buste, prise corde ou barre.',
      'Tendre les bras vers le bas jusqu’à l’extension complète.',
      'Remonter contrôlé sans que les coudes n’avancent.',
    ],
    tips: ['Buste légèrement incliné, gainage constant.'],
    mistakes: ['Écarter les coudes du buste et pousser avec les épaules.'],
    poseId: 'triceps-pushdown',
  },
  {
    slug: 'dips',
    name: 'Dips',
    aliases: ['dips barres paralleles'],
    category: 'functional',
    primary: ['triceps', 'chest'],
    secondary: ['shoulders'],
    metricSet: 'bodyweight',
    steps: [
      'En appui bras tendus sur les barres parallèles.',
      'Descendre en fléchissant les coudes jusqu’à ~90°.',
      'Repousser jusqu’à l’extension complète.',
    ],
    tips: ['Buste vertical = accent triceps ; penché en avant = accent pectoraux.'],
    mistakes: ['Descendre trop bas en haussant les épaules.'],
  },
  // ————— Abdos / gainage —————
  {
    slug: 'crunch-machine',
    name: 'Crunch machine',
    aliases: ['abdominal crunch machine', 'crunch'],
    category: 'machine',
    primary: ['abs'],
    secondary: [],
    metricSet: 'strength',
    steps: [
      'Assis, poitrine contre le pad ou mains sur les poignées.',
      'Enrouler le buste vers l’avant en expirant.',
      'Revenir lentement sans relâcher complètement.',
    ],
    tips: ['C’est un enroulement de la colonne, pas une flexion de hanche.'],
    mistakes: ['Tirer avec les bras au lieu de contracter les abdos.'],
  },
  {
    slug: 'gainage',
    name: 'Gainage (planche)',
    aliases: ['planche', 'plank', 'tapis'],
    category: 'functional',
    primary: ['abs'],
    secondary: ['shoulders', 'glutes'],
    metricSet: 'isometric',
    steps: [
      'En appui sur les avant-bras et les pointes de pieds, coudes sous les épaules.',
      'Aligner tête-épaules-hanches-chevilles, bassin en légère rétroversion.',
      'Tenir la position en respirant normalement.',
    ],
    tips: ['Serrer fessiers et abdos en continu : la position ne bouge pas.'],
    mistakes: ['Hanches qui montent en pyramide ou qui s’affaissent.'],
    poseId: 'plank',
  },
  {
    slug: 'crunch-swiss-ball',
    name: 'Crunch sur Swiss ball',
    aliases: ['swiss ball', 'crunch ballon'],
    category: 'functional',
    primary: ['abs'],
    secondary: [],
    metricSet: 'bodyweight',
    steps: [
      'Bas du dos sur le ballon, pieds à plat écartés, mains aux tempes.',
      'Enrouler le buste en décollant les omoplates.',
      'Redescendre contrôlé en suivant la courbe du ballon.',
    ],
    tips: ['Le ballon permet une amplitude plus grande qu’au sol : en profiter en contrôle.'],
    mistakes: ['Tirer sur la nuque avec les mains.'],
  },
  {
    slug: 'russian-twist',
    name: 'Russian twist medecine ball',
    aliases: ['medecine ball', 'rotations russes'],
    category: 'functional',
    primary: ['abs'],
    secondary: [],
    metricSet: 'bodyweight',
    steps: [
      'Assis, buste incliné en arrière, ballon tenu devant soi, pieds décollés ou posés.',
      'Tourner le buste d’un côté puis de l’autre en gardant le dos neutre.',
    ],
    tips: ['La rotation vient du buste, pas des bras qui se baladent.'],
    mistakes: ['Arrondir le dos pour aller plus vite.'],
  },
  // ————— Fonctionnel / full body —————
  {
    slug: 'kettlebell-swing',
    name: 'Kettlebell swing',
    aliases: ['kettlebells', 'swing'],
    category: 'functional',
    primary: ['glutes', 'fullbody'],
    secondary: ['back', 'abs'],
    metricSet: 'strength',
    steps: [
      'Pieds largeur d’épaules, kettlebell à deux mains, dos neutre.',
      'Charnière de hanche : envoyer la kettlebell entre les jambes.',
      'Extension de hanche explosive pour la propulser à hauteur de poitrine, laisser redescendre.',
    ],
    tips: ['C’est une extension de hanche, pas un squat ni une élévation frontale.'],
    mistakes: ['Soulever avec les épaules au lieu de propulser avec les hanches.'],
    poseId: 'kb-swing',
  },
  {
    slug: 'box-jump',
    name: 'Box jump',
    aliases: ['saut sur box'],
    category: 'functional',
    primary: ['legs', 'glutes'],
    secondary: ['calves'],
    metricSet: 'bodyweight',
    steps: [
      'Face à la box, pieds largeur de hanches.',
      'Contre-mouvement bras/hanches puis saut, réception souple pieds à plat sur la box.',
      'Se redresser complètement, redescendre en marchant (pas en sautant).',
    ],
    tips: ['Commencer bas : la hauteur se gagne, elle ne se devine pas.'],
    mistakes: ['Redescendre en sautant en arrière (réception à risque).'],
  },
  {
    slug: 'battle-ropes',
    name: 'Cordes ondulatoires',
    aliases: ['battle ropes', 'cordes'],
    category: 'functional',
    primary: ['fullbody', 'cardio'],
    secondary: ['shoulders', 'abs'],
    metricSet: 'isometric',
    steps: [
      'Une corde dans chaque main, position quart de squat, dos neutre.',
      'Créer des vagues alternées ou simultanées avec les bras.',
      'Maintenir le rythme sur la durée prévue.',
    ],
    tips: ['La position basse et stable fait travailler tout le corps, pas seulement les bras.'],
    mistakes: ['Se redresser complètement et ne travailler que les épaules.'],
  },
  {
    slug: 'smith-machine',
    name: 'Smith machine (guidé)',
    aliases: ['barre guidee'],
    category: 'machine',
    primary: ['legs', 'chest', 'shoulders'],
    secondary: ['glutes', 'triceps'],
    metricSet: 'strength',
    steps: [
      'Régler la hauteur de barre selon l’exercice (squat, développé, rowing…).',
      'Déverrouiller en tournant la barre, exécuter le mouvement guidé.',
      'Reverrouiller sur les crochets en fin de série.',
    ],
    tips: ['Le guidage fixe la trajectoire : placer les pieds/le banc en conséquence.'],
    mistakes: ['Reproduire exactement la position du squat libre (la trajectoire verticale impose d’avancer les pieds).'],
  },
  // ————— Cardio —————
  {
    slug: 'tapis-de-course',
    name: 'Tapis de course',
    aliases: ['treadmill', 'course tapis'],
    category: 'cardio',
    primary: ['cardio'],
    secondary: ['legs', 'calves'],
    metricSet: 'cardio_run',
    steps: [
      'Monter sur les rebords, démarrer à vitesse de marche, puis se placer sur la bande.',
      'Augmenter progressivement vitesse et/ou inclinaison.',
      'Terminer par 2-3 minutes de retour au calme en marchant.',
    ],
    tips: ['Ne pas s’accrocher aux poignées en pente : cela annule l’inclinaison.'],
    mistakes: ['Sauter directement à vitesse cible sans échauffement.'],
  },
  {
    slug: 'velo',
    name: 'Vélo (droit/couché)',
    aliases: ['velo droit couche', 'bike', 'velo stationnaire'],
    category: 'cardio',
    primary: ['cardio'],
    secondary: ['legs'],
    metricSet: 'cardio_bike',
    steps: [
      'Régler la hauteur de selle : jambe presque tendue quand la pédale est en bas.',
      'Pédaler à cadence régulière (~80-100 rpm), ajuster la résistance.',
    ],
    tips: ['Une selle trop basse fatigue les genoux ; trop haute fait balancer le bassin.'],
    mistakes: ['Résistance trop faible « pour durer » : viser un effort qui essouffle légèrement.'],
  },
  {
    slug: 'elliptique',
    name: 'Vélo elliptique',
    aliases: ['elliptical', 'velo elliptique'],
    category: 'cardio',
    primary: ['cardio'],
    secondary: ['fullbody'],
    metricSet: 'cardio_generic',
    steps: [
      'Pieds à plat sur les patins, mains sur les poignées mobiles.',
      'Pousser jambes et bras en coordination, buste droit.',
    ],
    tips: ['Pousser aussi avec les bras : c’est ce qui en fait un exercice complet.'],
    mistakes: ['S’avachir sur la console en fin de séance.'],
  },
  {
    slug: 'rameur',
    name: 'Rameur',
    aliases: ['rowing cardio', 'rower', 'concept2'],
    category: 'cardio',
    primary: ['cardio', 'back'],
    secondary: ['legs', 'biceps'],
    metricSet: 'cardio_row',
    steps: [
      'Sangler les pieds, saisir la poignée, dos neutre, tibias verticaux.',
      'Pousser d’abord avec les jambes, puis incliner le buste, puis tirer les bras.',
      'Revenir dans l’ordre inverse : bras, buste, jambes.',
    ],
    tips: ['Séquence jambes → buste → bras, à ~60 % jambes.', 'Viser un rythme régulier (le split/500 m est la boussole).'],
    mistakes: ['Tirer avec les bras en premier.', 'Dos arrondi en position de départ.'],
    poseId: 'rowing',
  },
  {
    slug: 'stepper',
    name: 'Stepper / monte-escaliers',
    aliases: ['stairmaster', 'monte escaliers'],
    category: 'cardio',
    primary: ['cardio'],
    secondary: ['legs', 'glutes', 'calves'],
    metricSet: 'cardio_generic',
    steps: [
      'Pieds entiers sur les marches, mains posées légèrement sur les rampes.',
      'Monter à rythme régulier en poussant dans les talons.',
    ],
    tips: ['Moins on s’appuie sur les rampes, plus l’exercice est efficace.'],
    mistakes: ['Reporter tout son poids sur les bras.'],
  },
];
