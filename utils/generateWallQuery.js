const { pgp } = require('../db');

const generateWallQuery = (toUpsert, toDelete, floor) => {
  const upsQuery =
    toUpsert.length > 0
      ? pgp.helpers.insert(toUpsert, ['id', 'coords', 'floor'], 'walls') +
        ' on conflict (id) do update set coords=excluded.coords'
      : '';

  const delQuery = toDelete
    ? { query: 'DELETE FROM walls WHERE id IN ($1:list)', values: [toDelete] }
    : '';

  const query = pgp.helpers.concat([
    upsQuery,
    delQuery,
    { query: 'SELECT * FROM walls WHERE floor = $1', values: [floor] }
  ]);

  return query;
};

module.exports = generateWallQuery;
