import { action, computed, Action, Computed } from 'easy-peasy';

export interface ArtPiece {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  tags: string[];
}

export interface ArtModel {
  pieces: ArtPiece[];
  selectedPiece: ArtPiece | null;
  addPiece: Action<ArtModel, ArtPiece>;
  removePiece: Action<ArtModel, string>;
  selectPiece: Action<ArtModel, ArtPiece | null>;
  getPiecesByTag: Computed<ArtModel, (tag: string) => ArtPiece[]>;
}

export const artModel: ArtModel = {
  pieces: [],
  selectedPiece: null,

  addPiece: action((state, payload) => {
    state.pieces.push(payload);
  }),

  removePiece: action((state, payload) => {
    state.pieces = state.pieces.filter((piece) => piece.id !== payload);
  }),

  selectPiece: action((state, payload) => {
    state.selectedPiece = payload;
  }),

  getPiecesByTag: computed((state) => (tag: string) => {
    return state.pieces.filter((piece) => piece.tags.includes(tag));
  }),
};
