import {
  selectDeviceActiveItemStatus,
  selectTaskerActiveItemProperties
} from 'app/selectors';
import { taskTT } from 'common/uiStates';
import React from 'react';
import { shallowEqual, useSelector } from 'react-redux';

const DeviceItem = ({ name, clickHandler, id }) => {
  const { isEditing, activeItemType } = useSelector(
    selectTaskerActiveItemProperties,
    shallowEqual
  );
  const isCheckedOff = useSelector(state =>
    selectDeviceActiveItemStatus(state, id)
  );
  const isCheckedOffAble = activeItemType === taskTT;

  const baseClassName = 'device-item';

  const checkOffableClassName = `${baseClassName}${
    isCheckedOffAble ? '-checkoffable' : '-noncheckoffable'
  }`;

  const checkedOffClassName = `${baseClassName}${
    isCheckedOffAble && isCheckedOff ? '-notcheckedoff' : '-checkedoff'
  }`;

  const className = isEditing
    ? `${baseClassName} ${baseClassName + '-edit'}`
    : `${baseClassName} ${checkOffableClassName} ${checkedOffClassName}`;

  return (
    <div className={className} onClick={clickHandler}>
      {name}
    </div>
  );
};

export default DeviceItem;
