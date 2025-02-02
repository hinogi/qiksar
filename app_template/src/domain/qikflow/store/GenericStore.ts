import Query, { defaultFetchMode } from "src/domain/qikflow/base/Query";
import { defineStore } from "pinia";
import { GqlRecords, GqlRecord } from "../base/GqlTypes";

export function CreateStore<Id extends string>(name: Id) {
  const createStore = defineStore(name, {
    state: () => {
      return {
        Rows: [] as GqlRecords,
        CurrentRecord: {} as GqlRecord,
        busy: false,
        hasRecord: false,
        TableColumns: [],
        view: {} as Query,
      };
    },

    getters: {
      Busy: (state) => {
        return state.busy;
      },
      RecordLoaded: (state) => {
        return state.hasRecord;
      },

      Pagination: (state) => {
        return {
          sortBy: state.view.SortBy,
          descending: !state.view.Asc,
          page: 1,
          rowsPerPage: 20,
        };
      },

      // Return the rows of data in a format suitable for use in drop down selections or menus
      GetSelections: (state): GqlRecords => {
        if (state.Rows.length == 0)
          console.log(
            "Unable to build Enum Selections from empty dataset: " +
              state.view.Schema.EntityType
          );

        const selections = [] as GqlRecords;
        state.Rows.map((r) =>
          selections.push(state.view.Schema.SelectionTranslator(r))
        );

        return selections;
      },

      NewRecord: (state): GqlRecord => {
        state.CurrentRecord = {};

        state.busy = false;
        state.hasRecord = true;

        return state.CurrentRecord;
      },
    },

    actions: {
      //#region initialise setup

      SetLoaded(loaded = true): void {
        this.hasRecord = loaded;
      },

      SetBusy(busy = true): void {
        this.busy = busy;
      },
      // setup the view and cache the column definitions for table presentation
      setView(name: string): void {
        this.view = Query.GetView(name);
        this.TableColumns = <[]>this.view.TableColumns;
      },

      //#endregion

      //#region CRUD

      //#region Fetch

      async fetchById(
        id: string,
        translate = true,
        fm = defaultFetchMode
      ): Promise<GqlRecord> {
        const record = await this.view.FetchById(id, fm, this, translate);

        if (!record)
          throw `${this.view.Schema.EntityType} not found with id '${id}'`;

        return record;
      },

      async fetchAll(translate = true): Promise<GqlRecords> {
        return await this.view.FetchAll(this, translate);
      },

      async fetchWhere(
        where: string,
        fm = defaultFetchMode,
        translate = true
      ): Promise<GqlRecords> {
        return await this.view.FetchWhere(where, fm, this, translate);
      },

      //#endregion

      //#region Insert

      async add(record: GqlRecord, fm = defaultFetchMode): Promise<GqlRecord> {
        return await this.view.Insert(record, fm, this);
      },

      //#endregion

      //#region Update

      async update(
        current: GqlRecord,
        original: GqlRecord
      ): Promise<GqlRecord> {
        const diff = {} as GqlRecord;

        // Get the primary key
        diff[this.view.Schema.Key] = this.CurrentRecord[
          this.view.Schema.Key
        ] as string;

        // Get only the fields which have changed value
        Object.keys(current).map((k: string) => {
          if ((current[k] as string) !== (original[k] as string))
            diff[k] = current[k];
        });

        //console.log(JSON.stringify(diff));

        return await this.view.Update(diff, this);
      },

      //#endregion

      //#region Delete

      async delete(id: string): Promise<GqlRecord> {
        return await this.view.DeleteById(id, this);
      },

      async deleteWhere(where: string): Promise<GqlRecord> {
        return await this.view.DeleteWhere(where, this);
      },

      //#endregion

      //#endregion
    },
  });

  const store = createStore();
  store.setView(name);

  return store;
}
