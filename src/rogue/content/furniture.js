// The shop and the flats. DATA ONLY.
// Furniture: model key (ep1, ep9 and hub packs), price in coins, cosiness (komfort). Cosiness raises your nerve on the stairs.
// kind: 'floor' stands on the floor (a collider unless walk:true), 'wall' hangs on a wall (posters use a painted picture).
export const ITEMS = [
  { id: 'carpet', model: 'carpet', name: 'Rug', hu: 'szőnyeg', price: 20, cosy: 3, kind: 'floor', walk: true },
  { id: 'armchair', model: 'armchair', name: 'Armchair', hu: 'fotel', price: 40, cosy: 4, kind: 'floor' },
  { id: 'sofa', model: 'sofa', name: 'Sofa', hu: 'kanapé', price: 70, cosy: 6, kind: 'floor' },
  { id: 'gran_sofa', model: 'sv_sofa', name: 'Grandma\'s sofa', hu: 'nagyi kanapéja', price: 90, cosy: 7, kind: 'floor' },
  { id: 'coffeetable', model: 'coffeetable', name: 'Coffee table', hu: 'dohányzóasztal', price: 25, cosy: 2, kind: 'floor' },
  { id: 'tv', model: 'tubetv', name: 'Small TV', hu: 'tévé', price: 45, cosy: 3, kind: 'floor' },
  { id: 'oldtv', model: 'sv_tv', name: 'Old TV', hu: 'régi tévé', price: 55, cosy: 3, kind: 'floor' },
  { id: 'bookshelf', model: 'bookshelf', name: 'Bookshelf', hu: 'könyvespolc', price: 35, cosy: 3, kind: 'floor' },
  { id: 'cupboard', model: 'cupboard', name: 'Cupboard', hu: 'szekrény', price: 35, cosy: 2, kind: 'floor' },
  { id: 'wardrobe', model: 'wardrobe', name: 'Wardrobe', hu: 'ruhásszekrény', price: 50, cosy: 3, kind: 'floor' },
  { id: 'bed', model: 'bed', name: 'A real bed', hu: 'ágy', price: 80, cosy: 6, kind: 'floor' },
  { id: 'bigbed', model: 'bigbed', name: 'Big bed', hu: 'nagy ágy', price: 140, cosy: 8, kind: 'floor' },
  { id: 'bedside', model: 'bedside', name: 'Bedside table', hu: 'éjjeliszekrény', price: 15, cosy: 1, kind: 'floor' },
  { id: 'table', model: 'diningtable', name: 'Table', hu: 'asztal', price: 40, cosy: 2, kind: 'floor' },
  { id: 'chair', model: 'diningchair', name: 'Chair', hu: 'szék', price: 12, cosy: 1, kind: 'floor' },
  { id: 'fridge', model: 'fridge', name: 'Fridge', hu: 'hűtő', price: 60, cosy: 2, kind: 'floor' },
  { id: 'plant', model: 'sv_plant', name: 'Big plant', hu: 'szobanövény', price: 18, cosy: 3, kind: 'floor' },
  { id: 'lamp', model: 'sv_lamp', name: 'Standing lamp', hu: 'állólámpa', price: 30, cosy: 3, kind: 'floor' },
  { id: 'piano', model: 'sv_piano', name: 'Piano', hu: 'zongora', price: 150, cosy: 6, kind: 'floor' },
  { id: 'vase', model: 'sv_vase', name: 'Vase', hu: 'váza', price: 10, cosy: 1, kind: 'floor', walk: true },
  { id: 'teddy', model: 'teddy', name: 'Teddy bear', hu: 'plüssmaci', price: 10, cosy: 2, kind: 'floor', walk: true },
  { id: 'p_cat', img: 'sm_ep3_cat', name: 'Poster: sleepy cat', hu: 'poszter', price: 12, cosy: 2, kind: 'wall' },
  { id: 'p_skate', img: 'sm_ep5_skate', name: 'Poster: skater', hu: 'poszter', price: 12, cosy: 2, kind: 'wall' },
  { id: 'p_rink', img: 'sm_ep3_rink1', name: 'Poster: the rink', hu: 'poszter', price: 12, cosy: 2, kind: 'wall' },
  { id: 'p_morning', img: 'sm_ep6_morning', name: 'Poster: morning', hu: 'poszter', price: 12, cosy: 2, kind: 'wall' },
  { id: 'p_bench', img: 'sm_ep3_bench', name: 'Poster: autumn bench', hu: 'poszter', price: 12, cosy: 2, kind: 'wall' },
  { id: 'p_family', img: 'sm_ep9_family_photo', name: 'Old family photo', hu: 'családi fotó', price: 15, cosy: 3, kind: 'wall' },
];
export const ITEM = Object.fromEntries(ITEMS.map(i => [i.id, i]));

/** Flats you can move into. Rooms are rectangles in the flat's own coordinates (the front door is at x 0.9, z 0). */
export const FLATS = [
  { level: 1, name: 'One room', hu: 'egyszobás', price: 0, nerve: 0,
    rooms: [{ x0: 0, x1: 4.4, z0: -5, z1: 0 }] },
  { level: 2, name: 'One and a half rooms', hu: 'másfél szobás', price: 250, nerve: 5,
    rooms: [{ x0: 0, x1: 4.4, z0: -5, z1: 0 }, { x0: 4.4, x1: 7.4, z0: -5, z1: 0 }], doors: [{ x: 4.4, z0: -3.4, z1: -2.2 }] },
  { level: 3, name: 'Two rooms and a balcony', hu: 'kétszobás, erkélyes', price: 600, nerve: 10,
    rooms: [{ x0: 0, x1: 4.4, z0: -5, z1: 0 }, { x0: 4.4, x1: 8.6, z0: -5, z1: 0 }, { x0: 4.4, x1: 8.6, z0: -7, z1: -5, balcony: true }],
    doors: [{ x: 4.4, z0: -3.4, z1: -2.2 }, { z: -5, x0: 6, x1: 7.2 }] },
];
export const COSY_MAX = 30;
