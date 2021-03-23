const app = require('../app');
const db = require('../models');

const request = require('supertest');

const server = request(app);

describe.skip('End to end post', () => {
  afterAll(async () => {
    await db.Suggestion.destroy({truncate: true, cascade: true});
    await db.sequelize.close();
  });

  beforeAll(async () => {
    await db.Suggestion.destroy({truncate: true, cascade: true});
  });

  test('Should upload fields to elephant db and attachment to cloudinary db', async (done) => {
    const res = await server
      .post('/contribute')
      .set('Content-Type', 'multipart/form-data')
      .field('polyphony', '2')
      .field('keyboard', '49 toetsen')
      .field('control', 'CV/MIDI')
      .field('yearProduced', 1970)
      .field('memory', 'none')
      .field('oscillators', '8')
      .field('filter', 'LP 12 bB')
      .field('lfo', '3')
      .field('effects', 'Delay')
      .field('name', 'Super Synth XD808')
      .field('manufacturer', 'Roland')
      .attach('image', `${__dirname}/moog_prodigy.jpg`);
    expect(res.body).not.toEqual(null);
    const savedSuggestion = await db.Suggestion.findOne({
      where: {name: 'Super Synth XD808'},
    });
    expect(savedSuggestion).not.toBe(null);
    expect(savedSuggestion.manufacturer).toBe('Roland');
    expect(savedSuggestion.image).not.toBe(null);
    expect(savedSuggestion.name).toBe('Super Synth XD808');
    done();
  });

  test('Should give an error naming manufacturer is a required field', async (done) => {
    const res = await server
      .post('/contribute')
      .set('Content-Type', 'multipart/form-data')
      .field('yearProduced', 1970)
      .field('name', 'Super Synth XD808');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      errors: ['manufacturer is a required field'],
      message: 'Bad request',
    });
    done();
  });

  test('Should give an error naming image is a required field', async (done) => {
    const res = await server
      .post('/contribute')
      .set('Content-Type', 'multipart/form-data')
      .field('yearProduced', 1970)
      .field('name', 'Super Synth XD808')
      .field('manufacturer', 'Roland');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      errors: ['image is a required field'],
      message: 'Bad request',
    });
    done();
  });

  test('Should give an error saying the file is to big', async (done) => {
    const res = await server
      .post('/contribute')
      .set('Content-Type', 'multipart/form-data')
      .field('yearProduced', 1970)
      .field('name', 'Super Synth XD808')
      .field('manufacturer', 'Roland')
      .attach('image', `${__dirname}/testBigFile.jpg`);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      errors: ['File too large'],
      message: 'File too large',
    });
    done();
  }, 30000);
});

describe.only('patch suggestions/id/accept', () => {
  afterAll(async () => {
    await db.Suggestion.destroy({truncate: true, cascade: true});
    await db.Synth.destroy({truncate: true, cascade: true});
    await db.Specification.destroy({truncate: true, cascade: true});
    await db.Manufacturer.destroy({truncate: true, cascade: true});
    await db.sequelize.close();
  });

  beforeAll(async () => {
    await db.Suggestion.destroy({truncate: true, cascade: true});
    await db.Synth.destroy({truncate: true, cascade: true});
    await db.Specification.destroy({truncate: true, cascade: true});
    await db.Manufacturer.destroy({truncate: true, cascade: true});
  });

  beforeEach(async () => {
    await db.Suggestion.destroy({truncate: true, cascade: true});
    await db.Synth.destroy({truncate: true, cascade: true});
    await db.Specification.destroy({truncate: true, cascade: true});
    await db.Manufacturer.destroy({truncate: true, cascade: true});
  });

  test('should move data from Suggestion to Synth, Specification & Manufacturer tables', async (done) => {
    const suggestion = await db.Suggestion.create({
      name: 'Synthesizer',
      manufacturer: 'Roland',
      yearProduced: 2000,
      image: 'url',
    });
    const res = await server.patch(`/admin/${suggestion.id}/accept`);
    expect(res.status).not.toBe(404);
    expect(res.status).toBe(201);
    const synthesizerAccepted = await db.Synth.findOne({
      where: {name: 'Synthesizer'},
      include: [db.Specification, db.Manufacturer],
    });
    expect(synthesizerAccepted.Specification.yearProduced).toBe(2000);
    expect(synthesizerAccepted.img).toBe('url');
    expect(synthesizerAccepted.Manufacturer.manufacturer).toBe('Roland');
    done();
  });

  test('should give error that there is no record found (on param)', async (done) => {
    const suggestion = await db.Suggestion.create({
      name: 'Synthesizer',
      manufacturer: 'Roland',
      yearProduced: 2000,
      image: 'url',
    });
    const res = await server.patch(`/admin/2/accept`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      data: null,
      errors: ['Not found'],
      message: 'No suggestion found',
    });
    done();
  });

  test('should accept suggestion when manufacturer exists ', async (done) => {
    const suggestion = await db.Suggestion.create({
      name: 'Synthesizer',
      manufacturer: 'Roland',
      yearProduced: 2000,
      image: 'url',
    });
    const manufacturer = await db.Manufacturer.create({
      manufacturer: 'Roland',
    });
    const res = await server.patch(`/admin/${suggestion.id}/accept`);
    expect(res.status).not.toBe(404);
    expect(res.status).toBe(201);
    const synthesizerAccepted = await db.Synth.findOne({
      where: {name: 'Synthesizer'},
      include: [db.Specification, db.Manufacturer],
    });
    expect(synthesizerAccepted.Specification.yearProduced).toBe(2000);
    expect(synthesizerAccepted.img).toBe('url');
    expect(synthesizerAccepted.Manufacturer.manufacturer).toBe('Roland');
    done();
  });

  test('should accept suggestion when manufacturer is non existing', async (done) => {
    const suggestion = await db.Suggestion.create({
      name: 'Synthesizer',
      manufacturer: 'Roland',
      yearProduced: 2000,
      image: 'url',
    });
    const manufacturer = await db.Manufacturer.create({
      manufacturer: 'Korg',
    });
    const res = await server.patch(`/admin/${suggestion.id}/accept`);
    expect(res.status).not.toBe(404);
    expect(res.status).toBe(201);
    const synthesizerAccepted = await db.Synth.findOne({
      where: {name: 'Synthesizer'},
      include: [db.Specification, db.Manufacturer],
    });
    expect(synthesizerAccepted.Specification.yearProduced).toBe(2000);
    expect(synthesizerAccepted.img).toBe('url');
    expect(synthesizerAccepted.Manufacturer.manufacturer).toBe('Roland');
    done();
  });

  test('should not create record when name is already in synthesizer db, should display this as error message', async (done) => {
    const suggestion = await db.Suggestion.create({
      name: 'notAllowed',
      manufacturer: 'Roland',
      yearProduced: 2000,
      image: 'url',
    });
    const synth = await db.Synth.create({
      name: 'notAllowed',
    });
    const res = await server.patch(`/admin/${suggestion.id}/accept`);
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      data: null,
      message: 'There already is a synth named like that',
      errors: ['Not found'],
    });
    done();
  });
});
