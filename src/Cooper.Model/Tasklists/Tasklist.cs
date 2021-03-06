﻿//Copyright (c) CodeSharp.  All rights reserved. - http://www.icodesharp.com/

using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using CodeSharp.Core.DomainBase;
using CodeSharp.Core.Utils;

namespace Cooper.Model.Tasks
{
    /// <summary>任务表
    /// <remarks>
    /// 任务的最基本组织单位，但不是所有任务都必须对应一个任务表
    /// </remarks>
    /// </summary>
    public abstract class Tasklist : EntityBase<int>, IAggregateRoot
    {
        private static readonly Serializer _serializer = new Serializer();
        private string _extensions { get; set; }
        private IDictionary<string, string> _dict;

        /// <summary>获取任务表名称
        /// </summary>
        public string Name { get; private set; }
        /// <summary>获取创建时间
        /// </summary>
        public DateTime CreateTime { get; private set; }
        /// <summary>根据键获取对应设置
        /// </summary>
        /// <param name="key"></param>
        /// <returns></returns>
        public virtual string this[string key]
        {
            get
            {
                Assert.IsNotNullOrWhiteSpace(key);
                if (this._dict == null)
                    this._dict = this.Parse();
                return this._dict.ContainsKey(key) ? this._dict[key] : null;
            }
            set
            {
                Assert.IsNotNullOrWhiteSpace(key);
                if (this._dict == null)
                    this._dict = this.Parse();
                this._dict[key] = value;
                this._extensions = _serializer.JsonSerialize(this._dict);
            }
        }

        protected Tasklist() { this.CreateTime = DateTime.Now; }
        protected Tasklist(string name)
            : this()
        {
            this.SetName(name);
        }

        /// <summary>设置任务表名称
        /// </summary>
        /// <param name="name"></param>
        public void SetName(string name)
        {
            Assert.IsNotNull(name);
            Assert.LessOrEqual(name.Length, 50);
            this.Name = name;
        }
        ///// <summary>向任务表增加任务
        ///// </summary>
        ///// <param name="task"></param>
        //public void AddTask(Task task)
        //{
        //    Assert.IsValid(task);
        //    var temp = task.ID + SPLIT;
        //    if (!string.IsNullOrWhiteSpace(this[LIST])
        //        && this[LIST].Contains(temp))
        //        return;
        //    //HACK:任务表是新增设计，目前设计还不明朗，多对多关系简化为此实现？
        //    this[LIST] += temp;
        //}

        private IDictionary<string, string> Parse()
        {
            return string.IsNullOrWhiteSpace(this._extensions)
                ? new Dictionary<string, string>()
                : _serializer.JsonDeserialize<IDictionary<string, string>>(this._extensions);
        }
    }
}