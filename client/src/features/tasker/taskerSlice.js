import { createSlice, nanoid, createEntityAdapter } from '@reduxjs/toolkit';
import { taskTT } from 'common/uiStates';

const taskerAdapter = createEntityAdapter();
const initialState = taskerAdapter.getInitialState({
  activeItem: null,
  activeItemType: taskTT,
  isEditing: false,
  isLoading: false,
  taskerHistory: null,
  byDevice: {},
  toggleCheckOffRequestObject: {}
});

const cancelChangesFn = state => {
  const activeItem = state.entities[state.activeItem];
  if (activeItem.isNew) {
    for (let i = 0, l = activeItem.devices.length; i < l; i++) {
      delete state.byDevice[activeItem.devices[i]];
    }

    taskerAdapter.removeOne(state, state.activeItem);
  } else {
    const oldItem = state.taskerHistory;
    const newItem = state.entities[state.activeItem];
    if (oldItem.devices) {
      const oldDeviceSet = new Set(oldItem.devices);
      const newDeviceSet = new Set(newItem.devices);
      const toDeleteArr = [...newDeviceSet].filter(id => !oldDeviceSet.has(id));

      for (let i = 0, l = toDeleteArr.length; i < l; i++) {
        delete state.byDevice[toDeleteArr[i]][oldItem.id];
      }

      for (let i = 0, l = oldItem.devices.length; i < l; i++) {
        state.byDevice[oldItem.devices[i]][oldItem.id] = oldItem.byDeivce[i];
      }
    }
    delete oldItem.byDeivce;
    state.entities[state.activeItem] = oldItem;
    state.taskerHistory = null;
  }
  state.isEditing = false;
  state.activeItem = null;
};

const removeDeviceFn = (state, device, floor) => {
  const deviceIndex = state.entities[state.activeItem].devices.indexOf(device);
  const floorIndex = state.entities[state.activeItem].floors.indexOf(floor);
  state.entities[state.activeItem].devices.splice(deviceIndex, 1);
  state.entities[state.activeItem].floors.splice(floorIndex, 1);
  delete state.byDevice[device][state.activeItem];
};

const toggleDeviceFn = (state, payloadItem, isPartiallyToggled) => {
  const { id: device, floor } = payloadItem;
  if (
    typeof state.byDevice[device]?.[state.activeItem] !== 'undefined' &&
    !isPartiallyToggled
  ) {
    removeDeviceFn(state, device, floor);
  } else {
    if (typeof state.byDevice[device]?.[state.activeItem] === 'undefined') {
      if (!state.entities[state.activeItem].devices) {
        state.entities[state.activeItem].devices = [];
        state.entities[state.activeItem].floors = [];
      }

      state.entities[state.activeItem].devices.push(device);
      state.entities[state.activeItem].floors.push(floor);
      if (!state.byDevice[device]) {
        state.byDevice[device] = {};
      }

      state.byDevice[device][state.activeItem] = false;
    }
  }
};

const taskerSlice = createSlice({
  name: 'tasker',
  initialState,
  reducers: {
    addItem: {
      reducer(state, { payload }) {
        const id = payload.id;
        const deviceId = payload.devices[0];
        taskerAdapter.addOne(state, payload);
        if (deviceId) {
          if (!state.byDevice[deviceId]) {
            state.byDevice[deviceId] = {};
          }

          state.byDevice[deviceId][id] = false;
        }
        state.activeItem = id;
        state.activeItemType = payload.type;
        state.isEditing = true;
      },
      prepare({ deviceId = null, deviceFloor = null, type }) {
        const id = nanoid();
        const devices = deviceId ? [deviceId] : [];
        const floors = deviceFloor ? [deviceFloor] : [];
        const name = 'New ' + type;
        return {
          payload: {
            id,
            type,
            name,
            devices,
            floors,
            isNew: true
          }
        };
      }
    },
    toggleDevice(state, { payload }) {
      if (Array.isArray(payload)) {
        const toggledDevicesArrLength = payload.filter(
          device =>
            typeof state.byDevice[device.id]?.[state.activeItem] !== 'undefined'
        ).length;
        const isPartiallyToggled =
          toggledDevicesArrLength > 0 &&
          toggledDevicesArrLength < payload.length;

        for (let i = 0, l = payload.length; i < l; i++) {
          toggleDeviceFn(state, payload[i], isPartiallyToggled);
        }
      } else {
        toggleDeviceFn(state, payload);
      }
    },
    toggleDeviceCheckOff(state, { payload }) {
      state.toggleCheckOffRequestObject.id = state.activeItem;
      if (Array.isArray(payload)) {
        const checkedOffDevicesArrLength = payload.filter(
          id => state.byDevice[id][state.activeItem]
        ).length;
        const isPartiallyCheckedOff =
          checkedOffDevicesArrLength > 0 &&
          checkedOffDevicesArrLength < payload.length;
        for (let i = 0, l = payload.length; i < l; i++) {
          const id = payload[i];
          if (isPartiallyCheckedOff) {
            state.byDevice[id][state.activeItem] = true;
            state.toggleCheckOffRequestObject[id] = true;
          } else {
            state.toggleCheckOffRequestObject[id] = !state.byDevice[id][
              state.activeItem
            ];
            state.byDevice[id][state.activeItem] = !state.byDevice[id][
              state.activeItem
            ];
          }
        }
      } else {
        state.toggleCheckOffRequestObject[payload] = !state.byDevice[payload][
          state.activeItem
        ];
        state.byDevice[payload][state.activeItem] = !state.byDevice[payload][
          state.activeItem
        ];
      }
    },
    removeDevices(state, { payload }) {
      for (let i = 0, l = payload.length; i < l; i++) {
        const { device, floor } = payload[i];
        removeDeviceFn(state, device, floor);
      }
    },
    cancelChanges(state) {
      cancelChangesFn(state);
    },
    toggleActiveItem(state, { payload }) {
      if (!state.activeItem) {
        state.activeItem = payload;
        state.activeItemType = state.entities[payload].type;
      } else {
        state.activeItem = null;
      }
    },
    toggleEditing(state) {
      state.isEditing = !state.isEditing;
      if (state.taskerHistory) {
        state.taskerHistory = null;
      } else {
        const item = state.entities[state.activeItem];
        state.taskerHistory = item;
        state.taskerHistory.byDeivce =
          item.devices &&
          item.devices.map(device => state.byDevice[device][item.id]);
      }
    },
    setActiveItemType(state, { payload }) {
      if (state.isEditing) {
        cancelChangesFn(state);
      } else {
        state.activeItem = null;
      }
      state.activeItemType = payload;
    },
    clearRequestObject(state) {
      state.toggleCheckOffRequestObject = {};
    }
  },
  extraReducers: {
    'api/updateTaskerItem/fulfilled': (state, { payload }) => {
      const { ts, id, name } = payload;
      if (state.entities[id].isNew) {
        state.entities[id].createdAt = ts;
        state.entities[id].isNew = false;
      }

      state.entities[id].lasteEditedAt = ts;
      state.entities[id].name = name;
      state.isEditing = false;
      state.taskerHistory = null;
    },
    'api/loadAppData/fulfilled': (state, { payload }) => {
      const { tasks, taskDevices } = payload;
      taskerAdapter.addMany(state, tasks);
      for (let i = 0, l = taskDevices.length; i < l; i++) {
        const { itemId, deviceId, isCheckedOff } = taskDevices[i];
        if (!state.entities[itemId].devices) {
          state.entities[itemId].devices = [];
          state.entities[itemId].floors = [];
        }

        state.entities[itemId].floors.push(taskDevices[i].floor);
        state.entities[itemId].devices.push(taskDevices[i].deviceId);

        if (!state.byDevice[deviceId]) {
          state.byDevice[deviceId] = {};
        }

        state.byDevice[deviceId][itemId] = isCheckedOff;
      }
    },
    'api/removeTaskerItem/fulfilled': (state, { payload }) => {
      const id = payload;
      state.activeItem = null;
      const devices = state.entities[id].devices;
      if (Array.isArray(devices)) {
        for (const device of devices) {
          delete state.byDevice[device][id];
        }
      }
      taskerAdapter.removeOne(state, payload);
    },
    'api/checkOffTaskerItem/fulfilled': (state, { payload }) => {
      const id = payload;
      const item = state.entities[id];
      if (item.type === taskTT) {
        if (item.isCheckedOff) {
          state.entities[id].isCheckedOff = false;
        } else {
          state.entities[id].isCheckedOff = true;
          if (item.devices) {
            for (const device of item.devices) {
              state.byDevice[device][id] = true;
            }
          }
        }
      } else {
        state.entities[id].isCheckedOff = !item.isCheckedOff;
      }

      state.activeItem = null;
    }
  }
});

export const {
  addItem,
  toggleDevice,
  cancelChanges,
  toggleActiveItem,
  toggleEditing,
  toggleDeviceCheckOff,
  setActiveItemType,
  removeDevices,
  clearRequestObject
} = taskerSlice.actions;

export default taskerSlice.reducer;
