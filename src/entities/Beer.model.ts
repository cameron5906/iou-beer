import mongoose from 'mongoose';
import beerSchema from './Beer.schema';

const BeerModel = mongoose.model('Beer', beerSchema, 'beers');
export default BeerModel;